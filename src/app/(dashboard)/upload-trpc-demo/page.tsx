'use client';

import { useState } from 'react';
import { FileUploadTrpc } from './upload';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function UploadTrpcDemo() {
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
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">文件上传 TRPC 示例</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>上传文件</CardTitle>
            <CardDescription>
              使用TRPC接口上传文件，支持图片和PDF文件，最大5MB。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUploadTrpc
              onUploadComplete={handleUploadComplete}
              onUploadError={handleUploadError}
              acceptedFileTypes="image/*,application/pdf"
              maxSizeMB={5}
              buttonText="选择文件"
              confirmButtonText="上传文件"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>上传结果</CardTitle>
            <CardDescription>
              显示最近一次上传的结果或错误信息。
            </CardDescription>
          </CardHeader>
          <CardContent>
            {uploadResult && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">上传成功</AlertTitle>
                <AlertDescription className="text-green-700">
                  <div className="mt-2">
                    <p><strong>文件ID:</strong> {uploadResult.fileId}</p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-red-800">上传失败</AlertTitle>
                <AlertDescription className="text-red-700">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {!uploadResult && !error && (
              <div className="text-center py-8 text-gray-500">
                <p>请选择并上传文件以查看结果</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
