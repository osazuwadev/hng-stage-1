import { Router } from "express";
import axios from "axios";
import { v7 as uuidv7 } from "uuid";
import prisma from "../lib/prisma.js";

const router = Router();


// ================= POST /api/profiles =================
router.post("/profiles", async (req, res) => {
    const { name } = req.body;

    if (!name || name.trim() === "") {
        return res.status(400).json({
            status: "error",
            message: "name is required"
        });
    }

    if (typeof name !== "string" || !isNaN(name)) {
        return res.status(422).json({
            status: "error",
            message: "name must be a string"
        });
    }

    try {
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

        const [genderRes, ageRes, countryRes] = await Promise.all([
            axios.get(`https://api.genderize.io?name=${name}`),
            axios.get(`https://api.agify.io?name=${name}`),
            axios.get(`https://api.nationalize.io?name=${name}`)
        ]);

        const genderData = genderRes.data;
        const ageData = ageRes.data;
        const countryData = countryRes.data;

        if (!genderData.gender) {
            return res.status(502).json({
                status: "error",
                message: "Genderize failed"
            });
        }

        if (!ageData.age) {
            return res.status(502).json({
                status: "error",
                message: "Agify failed"
            });
        }

        if (!countryData.country?.length) {
            return res.status(502).json({
                status: "error",
                message: "Nationalize failed"
            });
        }

        const age = ageData.age;

        let age_group;
        if (age <= 12) age_group = "child";
        else if (age <= 19) age_group = "teenager";
        else if (age <= 59) age_group = "adult";
        else age_group = "senior";

        const topCountry = countryData.country.reduce((a, b) =>
            a.probability > b.probability ? a : b
        );

        const profile = await prisma.profile.create({
            data: {
                id: uuidv7(),
                name: name.toLowerCase(),
                gender: genderData.gender,
                gender_probability: genderData.probability,
                age,
                age_group,
                country_id: topCountry.country_id,
                country_name: topCountry.country_id,
                country_probability: topCountry.probability,
                created_at: new Date()
            }
        });

        return res.status(201).json({
            status: "success",
            data: profile
        });

    } catch (error) {
        return res.status(500).json({
            status: "error",
            message: "Server failure"
        });
    }
});


// ================= GET /api/profiles =================
router.get("/profiles", async (req, res) => {
    try {
        const {
            gender,
            country_id,
            age_group,
            min_age,
            max_age,
            min_gender_probability,
            min_country_probability,
            sort_by,
            order,
            page = 1,
            limit = 10
        } = req.query;

        const where = {};

        if (gender) where.gender = gender.toLowerCase();
        if (country_id) where.country_id = country_id.toUpperCase();
        if (age_group) where.age_group = age_group.toLowerCase();

        if (min_age || max_age) {
            where.age = {};
            if (min_age) where.age.gte = Number(min_age);
            if (max_age) where.age.lte = Number(max_age);
        }

        if (min_gender_probability) {
            where.gender_probability = {
                gte: Number(min_gender_probability)
            };
        }

        if (min_country_probability) {
            where.country_probability = {
                gte: Number(min_country_probability)
            };
        }

        let orderBy = { created_at: "desc" };

        if (sort_by) {
            orderBy = {
                [sort_by]: order === "desc" ? "desc" : "asc"
            };
        }

        const take = Math.min(Number(limit), 50) || 10;
        const skip = (Number(page) - 1) * take;

        const [profiles, total] = await Promise.all([
            prisma.profile.findMany({ where, orderBy, skip, take }),
            prisma.profile.count({ where })
        ]);

        return res.json({
            status: "success",
            page: Number(page),
            limit: take,
            total,
            data: profiles
        });

    } catch {
        return res.status(500).json({
            status: "error",
            message: "Server failure"
        });
    }
});


// ================= NLP PARSER =================
function parseQuery(q) {
    if (!q) return null;

    const query = q.toLowerCase();
    const filters = {};

    if (query.includes("male")) filters.gender = "male";
    if (query.includes("female")) filters.gender = "female";

    if (query.includes("young")) {
        filters.min_age = 16;
        filters.max_age = 24;
    }

    const match = query.match(/above (\d+)/);
    if (match) filters.min_age = Number(match[1]);

    if (query.includes("teenager")) filters.age_group = "teenager";
    if (query.includes("adult")) filters.age_group = "adult";

    const countryMap = {
        nigeria: "NG",
        kenya: "KE",
        angola: "AO"
    };

    for (const c in countryMap) {
        if (query.includes(c)) {
            filters.country_id = countryMap[c];
        }
    }

    return Object.keys(filters).length ? filters : null;
}


// ================= GET /api/profiles/search =================
router.get("/profiles/search", async (req, res) => {
    try {
        const { q, page = 1, limit = 10 } = req.query;

        const parsed = parseQuery(q);

        if (!parsed) {
            return res.status(400).json({
                status: "error",
                message: "Unable to interpret query"
            });
        }

        const where = {};

        if (parsed.gender) where.gender = parsed.gender;
        if (parsed.age_group) where.age_group = parsed.age_group;
        if (parsed.country_id) where.country_id = parsed.country_id;

        if (parsed.min_age || parsed.max_age) {
            where.age = {};
            if (parsed.min_age) where.age.gte = parsed.min_age;
            if (parsed.max_age) where.age.lte = parsed.max_age;
        }

        const take = Math.min(Number(limit), 50) || 10;
        const skip = (Number(page) - 1) * take;

        const [profiles, total] = await Promise.all([
            prisma.profile.findMany({ where, skip, take }),
            prisma.profile.count({ where })
        ]);

        return res.json({
            status: "success",
            page: Number(page),
            limit: take,
            total,
            data: profiles
        });

    } catch {
        return res.status(500).json({
            status: "error",
            message: "Server failure"
        });
    }
});

export default router;