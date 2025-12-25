import { getFirestore, Collections } from '../lib/firebase';
import { User, UserCreateInput, UserUpdateInput, PaginationResult, PaginationOptions } from '../types/models';
import { v4 as uuidv4 } from 'uuid';

const db = getFirestore();
const collection = db.collection(Collections.USERS);

export class UserRepository {
  /**
   * Create a new user
   */
  static async create(data: UserCreateInput): Promise<User> {
    const id = uuidv4();
    const now = new Date();
    
    const user: User = {
      id,
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    await collection.doc(id).set(user);
    
    // Update counter
    await this.incrementCounter(1);
    
    return user;
  }

  /**
   * Find user by ID
   */
  static async findById(id: string): Promise<User | null> {
    const doc = await collection.doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return this.docToUser(doc);
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<User | null> {
    const snapshot = await collection
      .where('email', '==', email)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return null;
    }
    
    return this.docToUser(snapshot.docs[0]);
  }

  /**
   * Find user by phone (with multiple formats)
   */
  static async findByPhone(phone: string): Promise<User | null> {
    const normalizedPhone = phone.replace(/\D/g, '');
    
    // Try exact match first
    let snapshot = await collection
      .where('phone', '==', phone)
      .limit(1)
      .get();
    
    if (!snapshot.empty) {
      return this.docToUser(snapshot.docs[0]);
    }

    // Try normalized
    snapshot = await collection
      .where('phone', '==', normalizedPhone)
      .limit(1)
      .get();
    
    if (!snapshot.empty) {
      return this.docToUser(snapshot.docs[0]);
    }

    // Try with country code
    snapshot = await collection
      .where('phone', '==', `55${normalizedPhone}`)
      .limit(1)
      .get();
    
    if (!snapshot.empty) {
      return this.docToUser(snapshot.docs[0]);
    }

    return null;
  }

  /**
   * Find all users with pagination
   */
  static async findMany(options: PaginationOptions = {}): Promise<PaginationResult<User>> {
    const { page = 1, limit = 10, orderBy = 'createdAt', orderDirection = 'desc' } = options;

    // Get total count
    const total = await this.getCount();
    const totalPages = Math.ceil(total / limit);

    // Build query
    let query = collection
      .orderBy(orderBy, orderDirection)
      .limit(limit);

    // For pagination, we use offset (less efficient but simpler for page-based)
    if (page > 1) {
      const offset = (page - 1) * limit;
      query = query.offset(offset);
    }

    const snapshot = await query.get();
    const users = snapshot.docs.map(doc => this.docToUser(doc));

    return {
      data: users,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Update user
   */
  static async update(id: string, data: UserUpdateInput): Promise<User | null> {
    const docRef = collection.doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return null;
    }

    const updateData = {
      ...data,
      updatedAt: new Date(),
    };

    await docRef.update(updateData);
    
    const updated = await docRef.get();
    return this.docToUser(updated);
  }

  /**
   * Delete user
   */
  static async delete(id: string): Promise<boolean> {
    const docRef = collection.doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return false;
    }

    await docRef.delete();
    await this.incrementCounter(-1);
    
    return true;
  }

  /**
   * Check if email exists
   */
  static async emailExists(email: string, excludeId?: string): Promise<boolean> {
    let query = collection.where('email', '==', email);
    
    const snapshot = await query.limit(1).get();
    
    if (snapshot.empty) {
      return false;
    }

    if (excludeId && snapshot.docs[0].id === excludeId) {
      return false;
    }

    return true;
  }

  /**
   * Get total count
   */
  static async getCount(): Promise<number> {
    const counterDoc = await db.collection(Collections.COUNTERS).doc('users').get();
    if (!counterDoc.exists) {
      // Count manually if counter doesn't exist
      const snapshot = await collection.count().get();
      const count = snapshot.data().count;
      
      // Initialize counter
      await db.collection(Collections.COUNTERS).doc('users').set({ count });
      return count;
    }
    return counterDoc.data()?.count || 0;
  }

  /**
   * Increment counter
   */
  private static async incrementCounter(delta: number): Promise<void> {
    const counterRef = db.collection(Collections.COUNTERS).doc('users');
    await db.runTransaction(async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      const currentCount = counterDoc.exists ? (counterDoc.data()?.count || 0) : 0;
      transaction.set(counterRef, { count: Math.max(0, currentCount + delta) });
    });
  }

  /**
   * Convert Firestore document to User
   */
  private static docToUser(doc: FirebaseFirestore.DocumentSnapshot): User {
    const data = doc.data()!;
    return {
      id: doc.id,
      name: data.name,
      email: data.email,
      password: data.password,
      phone: data.phone,
      profile: data.profile,
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
      updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
    };
  }
}

