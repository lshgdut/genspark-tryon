"use client"

import React, { useEffect, useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/icons"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"

import { fileService } from "@/services/file"
import { tryonService } from "@/services/tryon"
import { ITryonCompositedFile, CompositeJob } from '@/types/tryon';
import debug from 'debug';

const log = debug('tryon:tryon-page');

const convertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      resolve(reader.result as string)
    }
    reader.onerror = reject
  })
}

export default function ImageGenApp() {
  const [step, setStep] = useState("step1")
  const [modelImage, setModelImage] = useState<File | null>(null)
  const [clothImage, setClothImage] = useState<File | null>(null)
  const [modelFileId, setModelFileId] = useState<string | null>(null)
  const [clothFileId, setClothFileId] = useState<string | null>(null)
  const [compositeImage, setCompositeImage] = useState<ITryonCompositedFile | null>(null)
  const [compositeVideo, setCompositeVideo] = useState<ITryonCompositedFile | null>(null)
  const [compositedTask, setCompositedTask] = useState<CompositeJob|null>(null)
  const isGenerating = compositedTask?.status === 'running' || compositedTask?.status === 'pending'
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [regenerateError, setRegenerateError] = useState<string | null>(null)
  const [videoError, setVideoError] = useState<string | null>(null)

  // useEffect(()=>{
  //   setStep('step3')
  //   // setClothFileId("1a0e2c83-d774-4ee3-aa81-81bc024c0a53.webp")
  //   // setModelFileId("00d0f25c-cda2-4e91-a48f-2ef74ddae36c.jpg")
  //   setCompositedTask({id:"xxx", status:'completed',})
  //   // setCompositeImage({ fileId: "6ae156cd-796b-4f23-9a59-d0ece334b1ea.png", fileUrl:"http://localhost:3000/composited/6ae156cd-796b-4f23-9a59-d0ece334b1ea.png", filePath:"xxx"})
  //   setCompositeVideo({ fileId: "xxx", fileUrl:'http://localhost:3000/composited/352e4f7a-08e3-4196-8132-fe8278072032.mp4'})
  // },[])

  const handleUpload = async () => {
    // setIsGenerating(true)
    setUploadError(null)

    try {
      // 上传模特和服装图片
      const [modelId, clothId] = await Promise.all([
        fileService.upload({
          name: modelImage!.name,
          type: modelImage!.type,
          size: modelImage!.size,
          base64: await convertToBase64(modelImage!),
        }),
        fileService.upload({
          name: clothImage!.name,
          type: clothImage!.type,
          size: clothImage!.size,
          base64: await convertToBase64(clothImage!),
        }),
      ])

      // 保存文件ID到状态中
      setModelFileId(modelId)
      setClothFileId(clothId)

      log("文件上传成功，模特ID:", modelId, "服装ID:", clothId)

      // 创建合成图片任务
      setStep("step2")
      // 直接传递文件ID给handleRegenerate，避免状态更新延迟问题
      await handleRegenerate(modelId, clothId)
    } catch (error) {
      log("上传文件或生成图片失败:", error)
      setUploadError(error instanceof Error ? error.message : "上传文件或生成图片过程中发生错误")
    // } finally {
      // setIsGenerating(false)
      // setCompositedTask(null)
    }
  }

  // 修改handleRegenerate函数，接受直接传入的文件ID参数
  const handleRegenerate = async (modelId?: string, clothId?: string) => {
    // 如果没有传入参数，则使用状态中的值
    const actualModelId = modelId || modelFileId;
    const actualClothId = clothId || clothFileId;

    if (!actualModelId || !actualClothId) {
      log("缺少模特或服装文件ID, modelFileId:", actualModelId, "clothFileId:", actualClothId)
      return
    }

    // setIsGenerating(true)
    setRegenerateError(null)

    try {
      // 调用后端API，发送modelFileId和clothFileId
      log("发送重新生成请求，模特ID:", actualModelId, "服装ID:", actualClothId)

      // 创建合成图片任务
      const {id: jobId} = await tryonService.composeImage({
        modelFileId: actualModelId,
        clothFileId: actualClothId
      })

      // 轮询任务状态
      const compositeImageFile = await tryonService.pollTaskStatus(jobId, {
        timeout: 60 * 60 * 1000, // 1小时超时
        onProgress: (_, task) => {
          // console.log(`合成图片任务状态: ${status}`, task)
          setCompositedTask(task.status == 'running' || task.status == 'pending' ? task : null)
        }
      })

          // 设置合成图片URL
      setCompositeImage(compositeImageFile)
    } catch (error) {
      log("重新生成失败:", error)
      setRegenerateError(error instanceof Error ? error.message : "重新生成图片过程中发生错误")
    } finally {
      // setIsGenerating(false)
      setCompositedTask(null)
    }
  }

  const handleGenerateVideo = async () => {
    if (!compositeImage) {
      log("缺少合成图片")
      return
    }

    setStep("step3")
    // setIsVideoGenerating(true)
    setVideoError(null)
    setCompositeVideo(null)

    try {
      // 调用后端API，发送合成图片URL生成视频
      log("发送生成视频请求，合成图片URL:", compositeImage)

      // 创建生成视频任务
      const {id: jobId} = await tryonService.composeVideo({
        fileId: compositeImage.fileId
      })

      // 轮询任务状态
      const result = await tryonService.pollTaskStatus(jobId, {
        // 视频生成可能需要更长时间
        timeout: 2 * 60 * 60 * 1000, // 2小时超时
        onProgress: (_, task) => {
          // console.log(`合成视频任务状态: ${status}`, task)
          setCompositedTask(task.status == 'running' || task.status == 'pending' ? task : null)
        }
      })

      // 设置视频URL
      setCompositeVideo(result)
    } catch (error) {
      log("生成视频失败:", error)
      setVideoError(error instanceof Error ? error.message : "生成视频过程中发生错误")
    // } finally {
    //   setIsVideoGenerating(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-12">
      <Tabs value={step} onValueChange={setStep} className="w-[800px] mx-auto">
        <TabsList className="grid grid-cols-3 w-full mb-6">
          <TabsTrigger value="step1">1 上传素材</TabsTrigger>
          <TabsTrigger value="step2" disabled={!compositeImage}>2 确认换装</TabsTrigger>
          <TabsTrigger value="step3" disabled={!compositeImage}>3 生成视频</TabsTrigger>
        </TabsList>

        {/* step 1 */}
        <TabsContent value="step1">
          <Card className="border-1 rounded-sm p-6">
            <div className="grid grid-cols-2 gap-6">
              {[
                { label: "Model", text: '模特图片', file: modelImage, setFile: setModelImage },
                { label: "Cloth", text: '服装图片', file: clothImage, setFile: setClothImage }
              ].map(({ label, text, file, setFile }) => (
                <div key={label} className="flex flex-col items-center justify-center py-6">
                  <div className="text-sm font-medium mb-2">{text}</div>
                  {file ? (
                    <Image
                      src={URL.createObjectURL(file)}
                      alt={text}
                      width={150}
                      height={150}
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-[150px] h-[150px] bg-muted" />
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const newFile = e.target.files?.[0] || null
                      setFile(newFile)
                    }}
                    className="mt-2 w-4/5"
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-col items-center justify-center">
              <Button
                className="mt-4"
                disabled={!modelImage || !clothImage || isGenerating}
                onClick={handleUpload}
              >
                {isGenerating ? "正在生成..." : "生成换装"}
              </Button>

              {uploadError && (
                <Alert variant="destructive" className="mt-4 max-w-md">
                  <AlertTitle>生成图片失败</AlertTitle>
                  <AlertDescription>{uploadError}</AlertDescription>
                </Alert>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="step2">
          <Card className="border-1 rounded-sm p-6">
            <div className="flex justify-center">
              {!isGenerating && compositeImage && (
                <Image
                  src={compositeImage?.fileUrl}
                  alt="composite"
                  width={200}
                  height={150}
                  className="mb-4 object-cover"
                  unoptimized
                />
              )}
              {isGenerating && (
                <div className="w-[400px] h-[300px] flex items-center justify-center bg-muted text-sm text-muted-foreground">
                  正在生成换装图片...
                </div>
              )}
            </div>
            <div className="flex flex-col items-center justify-center">
              <div className="flex flex-col md:flex-row justify-center gap-4">
                <Button variant="default" onClick={() => handleRegenerate()} disabled={isGenerating}>
                  {isGenerating
                    ? (compositedTask?.message || "正在生成..." )
                    : "重新生成换装"
                  }
                </Button>
                {
                  compositeImage && !isGenerating && (
                    <Button variant="destructive" onClick={() => { setStep("step3") }} disabled={!compositeImage || isGenerating}>
                      下一步
                    </Button>
                  )
                }
              </div>

              {regenerateError && (
                <Alert variant="destructive" className="mt-4 max-w-md">
                  <AlertTitle>重新生成图片失败</AlertTitle>
                  <AlertDescription>{regenerateError}</AlertDescription>
                </Alert>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="step3">
          <Card className="border-1 rounded-sm p-6">
            <div className="flex justify-center">
              {compositeImage && !compositeVideo && (
                <div className="relative inset-0 flex items-center justify-center">
                  <Image
                    src={compositeImage?.fileUrl}
                    alt="composite-bg"
                    width={200}
                    height={150}
                    className={"mb-4 " + (isGenerating ? "blur-xs" : "")}
                    unoptimized
                  />
                  {isGenerating && <Spinner />}
                </div>
              )}
              {!isGenerating && compositeVideo && (
                <video
                  width={200}
                  height={150}
                  controls
                  className="mb-4"
                >
                  <source src={compositeVideo.fileUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              )}
            </div>
            <div className="flex flex-col items-center justify-center">
              <div className="flex justify-center gap-4 flex-wrap">
                <Button variant="destructive" onClick={handleGenerateVideo} disabled={!compositeImage || isGenerating}>
                  {isGenerating
                    ? (compositedTask?.message || "正在生成...")
                    : (videoError || compositeVideo ? "重新生成视频": "生成视频")
                  }
                </Button>
                {!isGenerating && compositeVideo && (
                  <Button variant="secondary" asChild>
                    <a href={compositeVideo.fileUrl} download>
                      下载视频
                    </a>
                  </Button>
                )}
              </div>

              {videoError && (
                <Alert variant="destructive" className="mt-4 max-w-md">
                  <AlertTitle>生成视频失败</AlertTitle>
                  <AlertDescription>{videoError}</AlertDescription>
                </Alert>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
