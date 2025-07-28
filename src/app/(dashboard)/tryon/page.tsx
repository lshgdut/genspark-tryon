"use client"

import React, { useEffect, useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

import { fileService } from "@/services/file"

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
  const [compositeImage, setCompositeImage] = useState<string | null>(null)
  const [videoURL, setVideoURL] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isVideoGenerating, setIsVideoGenerating] = useState(false)

  const handleUpload = async () => {
    setIsGenerating(true)

    try {
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
      
      // 模拟生成合成图片
      setCompositeImage("/tryon/m2-regenerated.png")
      setIsGenerating(false)
      setStep("step2")
    } catch (error) {
      console.error("上传文件失败:", error)
      setIsGenerating(false)
    }
  }

  const handleRegenerate = async () => {
    if (!modelFileId || !clothFileId) {
      console.error("缺少模型或服装文件ID")
      return
    }
    
    setIsGenerating(true)
    
    try {
      // 这里应该调用后端API，发送modelFileId和clothFileId
      console.log("发送重新生成请求，模型ID:", modelFileId, "服装ID:", clothFileId)
      
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 1200))
      
      // 模拟接收到新的合成图片
      setCompositeImage("/tryon/m2-regenerated.png")
    } catch (error) {
      console.error("重新生成失败:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerateVideo = async () => {
    if (!modelFileId || !clothFileId) {
      console.error("缺少模型或服装文件ID")
      return
    }
    
    setStep("step3")
    setIsVideoGenerating(true)
    
    try {
      // 这里应该调用后端API，发送modelFileId和clothFileId生成视频
      console.log("发送生成视频请求，模型ID:", modelFileId, "服装ID:", clothFileId)
      
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // 模拟接收到生成的视频URL
      setVideoURL("/tryon/m2-regenerated.mp4")
    } catch (error) {
      console.error("生成视频失败:", error)
    } finally {
      setIsVideoGenerating(false)
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

        <TabsContent value="step1">
          <Card className="border-1 rounded-sm p-6">
            <div className="grid grid-cols-2 gap-6">
              {[
                { label: "Model", text: '模型图片', file: modelImage, setFile: setModelImage },
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
            <div className="flex justify-center">
              <Button
                className="mt-4"
                disabled={!modelImage || !clothImage || isGenerating}
                onClick={handleUpload}
              >
                {isGenerating ? "正在生成..." : "生成换装"}
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="step2">
          <Card className="border-1 rounded-sm p-6">
            <div className="flex justify-center">
              {compositeImage && (
                <Image
                  src={compositeImage}
                  alt="composite"
                  width={400}
                  height={300}
                  className="mb-4 object-cover"
                />
              )}
            </div>
            <div className="flex flex-col md:flex-row justify-center gap-4">
              <Button variant="default" onClick={handleRegenerate} disabled={isGenerating}>
                {isGenerating ? "正在生成..." : "重新换装"}
              </Button>
              {/* <Button variant="destructive" onClick={() => setStep("step1")} disabled={isGenerating}>
                上一步
              </Button> */}
              <Button variant="destructive" onClick={handleGenerateVideo} disabled={isVideoGenerating}>
                {isVideoGenerating ? "正在生成..." : "生成视频"}
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="step3">
          <Card className="border-1 rounded-sm p-6">
            <div className="flex justify-center">
              {compositeImage && (
                <div className="relative">
                  {isVideoGenerating && !videoURL ? (
                    <div className="w-[400px] h-[300px] flex items-center justify-center bg-muted text-sm text-muted-foreground">
                      Generating Video...
                    </div>
                  ) : videoURL ? (
                    <video
                      width={400}
                      height={300}
                      controls
                      className="mb-4"
                    >
                      <source src={videoURL} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <Image
                      src={compositeImage}
                      alt="composite-bg"
                      width={400}
                      height={300}
                      className="mb-4 blur-sm"
                    />
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-center gap-4 flex-wrap">
              <Button variant="destructive" onClick={handleGenerateVideo} disabled={isVideoGenerating}>
                {isVideoGenerating ? "正在生成..." : "重新生成视频"}
              </Button>
              {videoURL && (
                <Button variant="secondary" asChild>
                  <a href={videoURL} download>
                    下载视频
                  </a>
                </Button>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
