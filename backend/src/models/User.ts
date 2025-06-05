import {
    DataTypes,
    Model,
    Optional,
    Op
  } from "sequelize";
  import { sequelize } from "../config/database";
  import bcrypt from 'bcrypt';
  
  // Attributes for User
  interface UserAttributes {
    id: number;
    email: string;
    name: string;
    phone: string;
    password: string;
    status: boolean;
    profile: "admin" | "technician" | "requester";
    is_default: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }
  
  // Some fields are auto-generated
  interface UserCreationAttributes extends Optional<UserAttributes, "id" | "status"> {}

  interface PaginationParams {
    page: number;
    limit: number;
    search: string;
    offset: number;
  }
  
  export class User extends Model<UserAttributes, UserCreationAttributes> {
    declare id: number;
    declare email: string;
    declare name: string;
    declare phone: string;
    declare password: string;
    declare status: boolean;
    declare profile: "admin" | "technician" | "requester";
    declare is_default: boolean;
    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;

    // Método para verificar senha
    async checkPassword(password: string): Promise<boolean> {
      return bcrypt.compare(password, this.password);
    }
  }
  
  User.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      email: {
        type: DataTypes.STRING(128),
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      password: {
        type: DataTypes.STRING(256),
        allowNull: false,
      },
      status: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      profile: {
        type: DataTypes.ENUM("admin", "technician", "requester"),
        allowNull: false,
        defaultValue: "requester",
      },
      is_default: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      tableName: "users",
      sequelize,
      hooks: {
        beforeCreate: async (user: User) => {
          if (user.password) {
            user.password = await bcrypt.hash(user.password, 10);
          }
        },
        beforeUpdate: async (user: User) => {
          if (user.changed("password")) {
            user.password = await bcrypt.hash(user.password, 10);
          }
        },
      },
    }
  );

  // User Model with business logic
  export const UserModel = {
    async create(userData: UserCreationAttributes) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      return User.create({ ...userData, password: hashedPassword });
    },

    async findByEmail(email: string) {
      return User.findOne({ where: { email } });
    },

    async findById(id: number) {
      return User.findByPk(id);
    },

    async findAll() {
      return User.findAll();
    },

    async findAllWithPagination({ page, limit, search, offset }: PaginationParams) {
      const where = search ? {
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } }
        ]
      } : {};

      const { count, rows } = await User.findAndCountAll({
        where,
        limit,
        offset,
        order: [['name', 'ASC']]
      });

      return {
        users: rows,
        total: count
      };
    },

    async update(id: number, userData: Partial<UserAttributes>) {
      console.log('UserModel.update - Dados recebidos:', { id, userData });
      const user = await User.findByPk(id);
      if (!user) {
        console.log('UserModel.update - Usuário não encontrado');
        return null;
      }
      
      // Se a senha foi fornecida, atualiza
      if (userData.password) {
        console.log('UserModel.update - Senha fornecida:', userData.password);
        // Garantir que a senha é uma string
        const password = String(userData.password);
        console.log('UserModel.update - Senha convertida para string:', password);
        
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('UserModel.update - Hash gerado:', hashedPassword);
        
        // Verificar se o hash está funcionando
        const isValid = await bcrypt.compare(password, hashedPassword);
        console.log('UserModel.update - Hash é válido?', isValid);
        
        if (!isValid) {
          throw new Error('Erro ao gerar hash da senha');
        }
        
        // Atualiza a senha
        await user.update({ password: hashedPassword });
        console.log('UserModel.update - Senha atualizada com sucesso');
        
        // Remove a senha do userData para não tentar atualizar novamente
        delete userData.password;
      }
      
      // Se ainda houver outros dados para atualizar
      if (Object.keys(userData).length > 0) {
        console.log('UserModel.update - Atualizando outros dados:', userData);
        await user.update(userData);
      }
      
      // Busca o usuário atualizado
      const updatedUser = await User.findByPk(id);
      console.log('UserModel.update - Usuário atualizado:', {
        id: updatedUser?.id,
        email: updatedUser?.email,
        name: updatedUser?.name,
        phone: updatedUser?.phone,
        profile: updatedUser?.profile
      });
      
      return updatedUser;
    },

    async updatePassword(id: number, newPassword: string) {
      const user = await User.findByPk(id);
      if (!user) return false;
      
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await user.update({ password: hashedPassword });
      return true;
    },

    async verifyPassword(user: User, password: string) {
      console.log('Verificando senha...');
      console.log('Senha fornecida:', password);
      console.log('Hash armazenado:', user.password);
      
      try {
        const isValid = await bcrypt.compare(password, user.password);
        console.log('Resultado da comparação:', isValid);
        return isValid;
      } catch (error) {
        console.error('Erro ao verificar senha:', error);
        return false;
      }
    }
  };
  