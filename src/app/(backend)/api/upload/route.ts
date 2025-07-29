import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ensureUploadDirectory } from '@/libs/upload-utils';
import debug from 'debug';

const log = debug('tryon:upload-api');

export const dynamic = 'force-dynamic';

// 设置最大文件大小 (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// 允许的文件类型
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf'
];

// 处理文件上传的POST请求
export async function POST(request: NextRequest) {
  try {
    // 获取表单数据
    const formData = await request.formData();

    // 获取上传的文件
    const file = formData.get('file') as File | null;

    // 检查是否有文件
    if (!file) {
      return NextResponse.json(
        { error: '没有提供文件' },
        { status: 400 }
      );
    }

    // 检查文件大小
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: '文件大小超过限制 (5MB)' },
        { status: 400 }
      );
    }

    // 检查文件类型
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: '不支持的文件类型' },
        { status: 400 }
      );
    }

    // 创建唯一的文件名 (使用UUID)
    const fileExtension = file.name.split('.').pop() || '';
    const fileName = `${uuidv4()}.${fileExtension}`;

    // 确保上传目录存在
    const uploadsDir = await ensureUploadDirectory();
    const filePath = join(uploadsDir, fileName);

    // 将文件内容转换为Buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // 写入文件
    await writeFile(filePath, fileBuffer);

    // 返回成功响应，只返回文件ID
    return NextResponse.json({
      success: true,
      fileId: fileName
    });

  } catch (error) {
    log('文件上传错误: %O', error);
    return NextResponse.json(
      { error: '文件上传失败' },
      { status: 500 }
    );
  }
}
