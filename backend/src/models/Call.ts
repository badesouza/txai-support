import {
    DataTypes,
    Model,
    Optional
  } from "sequelize";
  import { sequelize } from "../config/database";
  import { User } from "./User";
  
  // Attributes for Call
  interface CallAttributes {
    id: number;
    description: string;
    userName: string; // Changed from userId to userName
    status: "open" | "in_service" | "completed" | "canceled";
    createdAt?: Date;
    updatedAt?: Date;
  }
  
  interface CallCreationAttributes extends Optional<CallAttributes, "id"> {}
  
  export class Call extends Model<CallAttributes, CallCreationAttributes> {
    declare id: number;
    declare description: string;
    declare userName: string; // Changed from userId to userName
    declare status: "open" | "in_service" | "completed" | "canceled";
    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;
  }
  
  Call.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      userName: { // Changed from userId to userName
        type: DataTypes.STRING,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("open", "in_service", "completed", "canceled"),
        defaultValue: "open",
      },
    },
    {
      tableName: "calls",
      sequelize,
    }
  );
  