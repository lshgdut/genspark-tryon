'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import debug from 'debug';

const log = debug('tryon:file-upload');

interface FileUploadProps {
  onUploadComplete?: (result: any) => void;
  onUploadError?: (error: string) => void;
  acceptedFileTypes?: string;
  maxSizeMB?: number;
  buttonText?: string;
  confirmButtonText?: string;
  className?: string;
}

export function FileUpload({
  onUploadComplete,
  onUploadError,
  acceptedFileTypes = 'image/*,application/pdf',
  maxSizeMB = 5,
  buttonText = '选择文件',
  confirmButtonText = '确认上传',
  className = '',
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 当选择文件改变时创建预览
  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    // 为图片文件创建预览URL
    if (selectedFile.type.startsWith('image/')) {
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(objectUrl);

      // 当组件卸载时清理URL
      return () => URL.revokeObjectURL(objectUrl);
    } else if (selectedFile.type === 'application/pdf') {
      // PDF文件使用PDF图标
      setPreviewUrl('/file.svg');
    } else {
      // 其他文件类型使用通用图标
      setPreviewUrl('/file.svg');
    }
  }, [selectedFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 检查文件大小
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      onUploadError?.(`文件大小超过限制 (${maxSizeMB}MB)`);
      return;
    }

    // 设置选中的文件，触发预览
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);

      // 创建FormData对象
      const formData = new FormData();
      formData.append('file', selectedFile);

      // 发送上传请求
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '上传失败');
      }

      // 上传成功回调
      onUploadComplete?.(result);
      
      // 清除选中的文件和预览
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (error) {
      log('上传错误: %O', error);
      onUploadError?.(error instanceof Error ? error.message : '上传失败');
    } finally {
      setIsUploading(false);
      // 重置文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const cancelSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={className}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={acceptedFileTypes}
        className="hidden"
      />
      
      {!selectedFile ? (
        // 文件选择按钮
        <Button
          onClick={triggerFileInput}
          disabled={isUploading}
          className="w-full"
        >
          {buttonText}
        </Button>
      ) : (
        // 文件预览和确认上传
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                {/* 文件预览 */}
                <div className="relative h-20 w-20 overflow-hidden rounded-md border">
                  {previewUrl && (
                    <Image 
                      src={previewUrl}
                      alt="File preview"
                      fill
                      style={{ objectFit: 'contain' }}
                    />
                  )}
                </div>
                
                {/* 文件信息 */}
                <div className="flex-1 space-y-1 text-sm">
                  <p className="font-medium truncate">{selectedFile.name}</p>
                  <p className="text-muted-foreground">
                    {Math.round(selectedFile.size / 1024)} KB
                  </p>
                  <p className="text-muted-foreground">
                    {selectedFile.type || '未知类型'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* 操作按钮 */}
          <div className="flex space-x-2">
            <Button
              onClick={cancelSelection}
              variant="outline"
              className="flex-1"
              disabled={isUploading}
            >
              取消
            </Button>
            <Button
              onClick={handleUpload}
              className="flex-1"
              disabled={isUploading}
            >
              {isUploading ? '上传中...' : confirmButtonText}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}