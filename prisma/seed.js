import pkg from '@prisma/client';
const { PrismaClient } = pkg;

import { v7 as uuidv7 } from 'uuid';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    console.log("Reading local data...");

    // READ LOCAL FILE (NO INTERNET NEEDED)
    const raw = fs.readFileSync("./prisma/data.json", "utf-8");
    const profiles = JSON.parse(raw);

    console.log(`Seeding ${profiles.length} profiles...`);

    for (const profile of profiles) {
        await prisma.profile.upsert({
            where: { name: profile.name },
            update: {},
            create: {
                id: uuidv7(),
                name: profile.name,
                gender: profile.gender,
                gender_probability: profile.gender_probability,
                age: profile.age,
                age_group: profile.age_group,
                country_id: profile.country_id,
                country_name: profile.country_name,
                country_probability: profile.country_probability,
            },
        });
    }

    console.log("✅ Seeding complete!");
}

main()
    .catch((err) => {
        console.error("❌ SEED ERROR:", err.message);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });