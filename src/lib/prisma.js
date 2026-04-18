import pkg from '@prisma/client';
const { PrismaClient } = pkg;

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "postgresql://neondb_owner:npg_z2ISoejVubq1@ep-proud-lab-amrlzgjv-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
        }
    }
});

export default prisma;