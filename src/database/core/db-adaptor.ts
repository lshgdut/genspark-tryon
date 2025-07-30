// import { isDesktop } from '@/const/version';
import { TryonDatabase } from '@/database/type';
import { getDBInstance } from './web-server';

// import { getPgliteInstance } from './electron';

/**
 * 懒加载数据库实例
 * 避免每次模块导入时都初始化数据库
 */
let cachedDB: TryonDatabase | null = null;

export const getServerDB = async (): Promise<TryonDatabase> => {
  // 如果已经有缓存的实例，直接返回
  if (cachedDB) return cachedDB;

  try {
    // 根据环境选择合适的数据库实例
    // cachedDB = isDesktop ? await getPgliteInstance() : getDBInstance();
    cachedDB = getDBInstance();
    return cachedDB;
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error;
  }
};

export const serverDB = getDBInstance();
