import { Router } from "express";
import axios from "axios";
import { v7 as uuidv7 } from "uuid";
import prisma from "../lib/prisma.js";

const router = Router();

// POST /api/profiles
router.post("/profiles", async (req, res) => {
    const { name } = req.body;

    // validation 1: missing or empty name
    if (!name || name.trim() === "") {
        return res.status(400).json({
            status: "error",
            message: "name is required"
        });
    }

    // validation 2: name must be a string
    if (typeof name !== "string" || !isNaN(name)) {
        return res.status(422).json({
            status: "error",
            message: "name must be a string"
        });
    }

    try {
        // check if profile already exists (idempotency)
        const existing = await prisma.profile.findUnique({
            where: { name: name.toLowerCase() }
        });

        if (existing) {
            return res.status(200).json({
                status: "success",
                message: "Profile already exists",
                data: existing
            });
        }

        // call all 3 APIs at the same time
        const [genderRes, ageRes, countryRes] = await Promise.all([
            axios.get(`https://api.genderize.io?name=${name}`),
            axios.get(`https://api.agify.io?name=${name}`),
            axios.get(`https://api.nationalize.io?name=${name}`)
        ]);

        const genderData = genderRes.data;
        const ageData = ageRes.data;
        const countryData = countryRes.data;

        // edge case: Genderize returned null
        if (genderData.gender === null || genderData.count === 0) {
            return res.status(502).json({
                status: "502",
                message: "Genderize returned an invalid response"
            });
        }

        // edge case: Agify returned null
        if (ageData.age === null) {
            return res.status(502).json({
                status: "502",
                message: "Agify returned an invalid response"
            });
        }

        // edge case: Nationalize returned no country
        if (!countryData.country || countryData.country.length === 0) {
            return res.status(502).json({
                status: "502",
                message: "Nationalize returned an invalid response"
            });
        }

        // extract data
        const gender = genderData.gender;
        const gender_probability = genderData.probability;
        const sample_size = genderData.count;
        const age = ageData.age;

        // compute age_group
        let age_group;
        if (age <= 12) age_group = "child";
        else if (age <= 19) age_group = "teenager";
        else if (age <= 59) age_group = "adult";
        else age_group = "senior";

        // get country with highest probability
        const topCountry = countryData.country.reduce((a, b) =>
            a.probability > b.probability ? a : b
        );
        const country_id = topCountry.country_id;
        const country_probability = topCountry.probability;

        // store in database
        const profile = await prisma.profile.create({
            data: {
                id: uuidv7(),
                name: name.toLowerCase(),
                gender,
                gender_probability,
                sample_size,
                age,
                age_group,
                country_id,
                country_probability,
                created_at: new Date().toISOString()
            }
        });

        return res.status(201).json({
            status: "success",
            data: profile
        });

    } catch (error) {
        console.error("FULL ERROR:", error.message)
        return res.status(500).json({
            status: "error",
            message: error.message 
        });
    }
});

// GET /api/profiles
router.get("/profiles", async (req, res) => {
    try {
        const { gender, country_id, age_group } = req.query;

        // build filter object
        const where = {};
        if (gender) where.gender = gender.toLowerCase();
        if (country_id) where.country_id = country_id.toUpperCase();
        if (age_group) where.age_group = age_group.toLowerCase();

        const profiles = await prisma.profile.findMany({ where });

        return res.status(200).json({
            status: "success",
            count: profiles.length,
            data: profiles
        });

    } catch (error) {
        return res.status(500).json({
            status: "error",
            message: "Something went wrong, please try again"
        });
    }
});

// GET /api/profiles/:id
router.get("/profiles/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const profile = await prisma.profile.findUnique({
            where: { id }
        });

        if (!profile) {
            return res.status(404).json({
                status: "error",
                message: "Profile not found"
            });
        }

        return res.status(200).json({
            status: "success",
            data: profile
        });

    } catch (error) {
        return res.status(500).json({
            status: "error",
            message: "Something went wrong, please try again"
        });
    }
});

// DELETE /api/profiles/:id
router.delete("/profiles/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const profile = await prisma.profile.findUnique({
            where: { id }
        });

        if (!profile) {
            return res.status(404).json({
                status: "error",
                message: "Profile not found"
            });
        }

        await prisma.profile.delete({
            where: { id }
        });

        return res.status(204).send();

    } catch (error) {
        return res.status(500).json({
            status: "error",
            message: "Something went wrong, please try again"
        });
    }
});

export default router;