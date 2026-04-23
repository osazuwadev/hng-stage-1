import fs from "fs";

const countries = [
  { id: "NG", name: "Nigeria" },
  { id: "KE", name: "Kenya" },
  { id: "AO", name: "Angola" },
  { id: "GH", name: "Ghana" }
];

const genders = ["male", "female"];

const profiles = [];

for (let i = 0; i < 2026; i++) {
  const age = Math.floor(Math.random() * 70) + 5;

  let age_group;
  if (age <= 12) age_group = "child";
  else if (age <= 19) age_group = "teenager";
  else if (age <= 59) age_group = "adult";
  else age_group = "senior";

  const country = countries[Math.floor(Math.random() * countries.length)];
  const gender = genders[Math.floor(Math.random() * genders.length)];

  profiles.push({
    name: `user_${i}`,
    gender,
    gender_probability: Number(Math.random().toFixed(2)),
    age,
    age_group,
    country_id: country.id,
    country_name: country.name,
    country_probability: Number(Math.random().toFixed(2))
  });
}

// write file
fs.writeFileSync(
  "prisma/data.json",
  JSON.stringify(profiles, null, 2)
);

console.log(" 2026 profiles generated successfully!");