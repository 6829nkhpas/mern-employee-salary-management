import 'dotenv/config';
import { Sequelize } from 'sequelize';

const db = new Sequelize(
    process.env.DB_NAME || 'db_penggajian3',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 3306),
        dialect: process.env.DB_DIALECT || 'mysql'
    }
);

export default db;
