
import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { ProblemPayload } from '../types';
import { CameraIcon, UploadIcon } from './icons';

interface ProblemInputProps {
  onGenerate: (problem: ProblemPayload) => void;
  isLoading: boolean;
}

export const ProblemInput = ({ onGenerate, isLoading }: ProblemInputProps): React.ReactNode => {
  const [problem, setProblem] = useState('');
  const [image, setImage] = useState<{ data: string; mimeType: string } | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const cleanupCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage({
          data: (reader.result as string).split(',')[1],
          mimeType: file.type,
        });
      };
      reader.readAsDataURL(file);
    }
  };
  
  const startCamera = async () => {
    cleanupCamera();
    setCapturedImage(null);
    setIsCameraOpen(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("カメラへのアクセスに失敗しました。ブラウザの権限設定を確認してください。");
      setIsCameraOpen(false);
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      setCapturedImage(canvas.toDataURL('image/jpeg'));
      cleanupCamera();
    }
  };
  
  const handleUseImage = () => {
    if(capturedImage) {
        const base64Data = capturedImage.split(',')[1];
        setImage({ data: base64Data, mimeType: 'image/jpeg' });
        setIsCameraOpen(false);
        setCapturedImage(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (problem.trim() || image) {
      onGenerate({ problem, image });
    }
  };

  // Effect to clean up camera stream on component unmount or modal close
  useEffect(() => {
    return () => {
      cleanupCamera();
    };
  }, [cleanupCamera]);


  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 h-full">
        <h2 className="text-2xl font-bold text-sky-400">問題を入力してください</h2>
        <div className="flex-grow flex flex-col">
          <textarea
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            placeholder="テキストで問題を入力するか、下のボタンから画像を添付してください"
            className="w-full flex-grow bg-indigo-950/70 border border-indigo-700 rounded-lg p-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all resize-none"
            disabled={isLoading}
          />
        </div>
        
        {image && (
          <div className="relative group">
            <img src={`data:${image.mimeType};base64,${image.data}`} alt="Problem preview" className="rounded-lg max-h-40 w-auto mx-auto" />
            <button
              type="button"
              onClick={() => setImage(null)}
              className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="画像を削除"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="flex gap-2">
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isLoading} className="flex-1 flex items-center justify-center bg-indigo-600/50 text-sky-300 font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700/70 transition-colors disabled:opacity-50">
                <UploadIcon />
                画像をアップロード
            </button>
            <button type="button" onClick={startCamera} disabled={isLoading} className="flex-1 flex items-center justify-center bg-indigo-600/50 text-sky-300 font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700/70 transition-colors disabled:opacity-50">
                <CameraIcon />
                カメラを起動
            </button>
        </div>

        <button
          type="submit"
          disabled={isLoading || (!problem.trim() && !image)}
          className="w-full bg-sky-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-sky-600 transition-colors disabled:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? '生成中...' : '解説を生成'}
        </button>
      </form>

      {/* Camera Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-indigo-900 p-4 rounded-lg max-w-3xl w-full">
            <h3 className="text-xl font-bold text-sky-400 mb-4 text-center">カメラで撮影</h3>
            <div className="bg-black rounded-lg overflow-hidden">
                {capturedImage ? (
                    <img src={capturedImage} alt="Captured" className="w-full h-auto" />
                ) : (
                    <video ref={videoRef} autoPlay playsInline className="w-full h-auto"></video>
                )}
            </div>
            <canvas ref={canvasRef} className="hidden"></canvas>
            <div className="flex justify-center gap-4 mt-4">
              {capturedImage ? (
                <>
                  <button onClick={() => { setCapturedImage(null); startCamera(); }} className="bg-gray-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600">再撮影</button>
                  <button onClick={handleUseImage} className="bg-sky-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-sky-600">この画像を使用</button>
                </>
              ) : (
                <button onClick={handleCapture} className="bg-sky-500 text-white font-bold py-2 px-4 rounded-full text-lg">撮影</button>
              )}
            </div>
            <button onClick={() => { cleanupCamera(); setIsCameraOpen(false); }} className="absolute top-4 right-4 text-white text-3xl">&times;</button>
          </div>
        </div>
      )}
    </>
  );
};
