import {
    DataTypes,
    Model,
    Optional
  } from "sequelize";
  import { sequelize } from "../config/database";
  import { Call } from "./Call";
  
  // Attributes for CallImage
  interface CallImageAttributes {
    id: number;
    call_id: number;
    image: string;
    createdAt?: Date;
    updatedAt?: Date;
  }
  
  interface CallImageCreationAttributes extends Optional<CallImageAttributes, "id"> {}
  
  export class CallImage
    extends Model<CallImageAttributes, CallImageCreationAttributes>
    implements CallImageAttributes {
    public id!: number;
    public call_id!: number;
    public image!: string;
  
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
  }
  
  CallImage.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      call_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: Call,
          key: "id",
        },
      },
      image: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      tableName: "calls_images",
      sequelize,
    }
  );
  
  // Relacionamento com Call
  Call.hasMany(CallImage, { foreignKey: "call_id", as: "images" });
  CallImage.belongsTo(Call, { foreignKey: "call_id" });
  