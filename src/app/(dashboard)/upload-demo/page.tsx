'use client';

import { useState } from 'react';
import { FileUpload } from '@/components/ui/file-upload';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';

export default function UploadDemoPage() {
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUploadComplete = (result: any) => {
    setUploadResult(result);
    setError(null);
  };

  const handleUploadError = (errorMessage: string) => {
    setError(errorMessage);
    setUploadResult(null);
  };

  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6">文件上传示例</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>上传文件</CardTitle>
            <CardDescription>
              支持图片(JPEG, PNG, WebP, GIF)和PDF文件，最大5MB
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUpload
              onUploadComplete={handleUploadComplete}
              onUploadError={handleUploadError}
              buttonText="选择文件"
              confirmButtonText="确认上传"
            />
          </CardContent>
          {error && (
            <CardFooter className="text-red-500">
              {error}
            </CardFooter>
          )}
        </Card>

        {uploadResult && (
          <Card>
            <CardHeader>
              <CardTitle>上传结果</CardTitle>
              <CardDescription>
                文件已成功上传
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  );
}