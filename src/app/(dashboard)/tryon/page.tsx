"use client"
import React, { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

export default function ImageGenApp() {
  const [step, setStep] = useState("step1")
  const [modelImage, setModelImage] = useState<File | null>(null)
  const [clothImage, setClothImage] = useState<File | null>(null)
  const [compositeImage, setCompositeImage] = useState<string | null>(null)
  const [videoURL, setVideoURL] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isVideoGenerating, setIsVideoGenerating] = useState(false)

  const handleUpload = () => {
    setIsGenerating(true)
    setTimeout(() => {
      setCompositeImage("/tryon/m2.jpg")
      setIsGenerating(false)
      setStep("step2")
    }, 1500)
  }

  const handleRegenerate = () => {
    setIsGenerating(true)
    setTimeout(() => {
      setCompositeImage("/tryon/m2-regenerated.png")
      setIsGenerating(false)
    }, 1200)
  }

  const handleGenerateVideo = () => {
    setIsVideoGenerating(true)
    setTimeout(() => {
      setVideoURL("/tryon/m2-regenerated.mp4")
      setIsVideoGenerating(false)
    }, 2000)
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
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">第一步：上传素材</h2>
            <div className="grid grid-cols-2 gap-6">
              {[
                { label: "Model", file: modelImage, setFile: setModelImage },
                { label: "Cloth", file: clothImage, setFile: setClothImage }
              ].map(({ label, file, setFile }) => (
                <div key={label} className="flex flex-col items-center justify-center py-6">
                  {file ? (
                    <Image
                      src={URL.createObjectURL(file)}
                      alt={label.toLowerCase()}
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
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">第二步：确认换装</h2>
            <div className="flex justify-center">
              {compositeImage && (
                <Image
                  src={compositeImage}
                  alt="composite"
                  width={400}
                  height={300}
                  className="mb-4"
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
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">第三步：生成视频</h2>
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
              {!videoURL && (
                <Button variant="destructive" onClick={handleGenerateVideo} disabled={isVideoGenerating}>
                  {isVideoGenerating ? "正在生成..." : "重新生成视频"}
                </Button>
              )}
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
