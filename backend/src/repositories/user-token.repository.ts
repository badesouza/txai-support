import { getFirestore, Collections } from '../lib/firebase';
import { UserToken, UserTokenCreateInput } from '../types/models';
import { v4 as uuidv4 } from 'uuid';

const db = getFirestore();
const collection = db.collection(Collections.USER_TOKENS);

export class UserTokenRepository {
  /**
   * Create a new token
   */
  static async create(data: UserTokenCreateInput): Promise<UserToken> {
    const id = uuidv4();
    const now = new Date();
    
    const token: UserToken = {
      id,
      userId: data.userId,
      token: data.token,
      createdAt: now,
      updatedAt: now,
    };

    await collection.doc(id).set(token);
    
    return token;
  }

  /**
   * Find token by value
   */
  static async findByToken(token: string): Promise<UserToken | null> {
    const snapshot = await collection
      .where('token', '==', token)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return null;
    }
    
    return this.docToToken(snapshot.docs[0]);
  }

  /**
   * Find tokens by user ID
   */
  static async findByUserId(userId: string): Promise<UserToken[]> {
    const snapshot = await collection
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => this.docToToken(doc));
  }

  /**
   * Delete token
   */
  static async delete(id: string): Promise<boolean> {
    const docRef = collection.doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return false;
    }

    await docRef.delete();
    return true;
  }

  /**
   * Delete token by value
   */
  static async deleteByToken(token: string): Promise<boolean> {
    const snapshot = await collection
      .where('token', '==', token)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return false;
    }

    await snapshot.docs[0].ref.delete();
    return true;
  }

  /**
   * Delete all tokens for a user
   */
  static async deleteByUserId(userId: string): Promise<number> {
    const snapshot = await collection
      .where('userId', '==', userId)
      .get();
    
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    
    return snapshot.size;
  }

  /**
   * Convert Firestore document to UserToken
   */
  private static docToToken(doc: FirebaseFirestore.DocumentSnapshot): UserToken {
    const data = doc.data()!;
    return {
      id: doc.id,
      userId: data.userId,
      token: data.token,
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
      updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
    };
  }
}

