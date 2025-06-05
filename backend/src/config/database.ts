import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const {
  DB_HOST,
  DB_PORT,
  DB_NAME,
  DB_USER,
  DB_PASSWORD,
  NODE_ENV,
} = process.env;

export const sequelize = new Sequelize(
  DB_NAME!,
  DB_USER!,
  DB_PASSWORD,
  {
    host: DB_HOST,
    port: Number(DB_PORT || 3306),
    dialect: "mysql",
    logging: NODE_ENV === "development" ? console.log : false,
  }
);
