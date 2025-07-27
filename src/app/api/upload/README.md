# 文件上传 API

这个API提供了文件上传功能，支持图片和PDF文件的上传，并提供文件预览功能。

## API 端点

```
POST /api/upload
```

## 请求格式

请求必须使用 `multipart/form-data` 格式，包含以下字段：

- `file`: 要上传的文件

## 支持的文件类型

- 图片: JPEG, PNG, WebP, GIF
- 文档: PDF

## 文件大小限制

最大文件大小为 5MB。

## 响应格式

### 成功响应

```json
{
  "success": true,
  "fileName": "1621234567890-example.jpg",
  "url": "/uploads/1621234567890-example.jpg",
  "size": 1024000,
  "type": "image/jpeg"
}
```

### 错误响应

```json
{
  "error": "错误信息"
}
```

可能的错误包括：

- `没有提供文件`: 请求中没有包含文件
- `文件大小超过限制 (5MB)`: 文件大小超过了5MB的限制
- `不支持的文件类型`: 上传了不支持的文件类型
- `文件上传失败`: 服务器处理文件时发生错误

## 客户端使用示例

### 使用FileUpload组件

```tsx
import { FileUpload } from '@/components/ui/file-upload';

export default function YourComponent() {
  const handleUploadComplete = (result) => {
    console.log('上传成功:', result);
    // 处理上传成功的结果
  };

  const handleUploadError = (error) => {
    console.error('上传失败:', error);
    // 处理上传失败的情况
  };

  return (
    <FileUpload
      onUploadComplete={handleUploadComplete}
      onUploadError={handleUploadError}
      acceptedFileTypes="image/*,application/pdf"
      maxSizeMB={5}
      buttonText="选择文件"
      confirmButtonText="确认上传"
    />
  );
}
```

### 使用fetch API

```javascript
async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || '上传失败');
    }

    return result;
  } catch (error) {
    console.error('上传错误:', error);
    throw error;
  }
}
```

## 配置上传目录

默认情况下，文件会上传到 `public/uploads` 目录。你可以通过设置环境变量 `TRYON_UPLOAD_DIR` 来自定义上传目录：

```bash
# 在 .env 文件中
TRYON_UPLOAD_DIR=/path/to/custom/upload/directory
```

## 文件预览功能

`FileUpload` 组件现在支持文件预览功能：

1. 用户点击「选择文件」按钮选择文件
2. 文件选择后，组件会显示文件预览（图片文件显示缩略图，其他文件显示图标）
3. 用户可以查看文件信息（文件名、大小、类型）
4. 用户可以选择「确认上传」或「取消」

## 注意事项

- 上传的文件默认保存在 `public/uploads` 目录中，可通过环境变量 `TRYON_UPLOAD_DIR` 自定义
- 文件名使用UUID生成，以确保唯一性
- 上传目录会在首次使用时自动创建
- 如果使用自定义上传目录（通过 `TRYON_UPLOAD_DIR` 环境变量），请确保：
  - 目录存在或应用有权限创建该目录
  - 应用有权限在该目录中写入文件
  - 如果目录不在 `public` 下，需要额外配置静态文件服务或API路由来访问这些文件