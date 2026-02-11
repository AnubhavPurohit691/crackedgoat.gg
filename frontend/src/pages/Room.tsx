import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMediasoup } from "../hooks/useMediasoup";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  ScreenShare,
  ScreenShareOff,
} from "lucide-react";

const getGridClasses = (count: number): string => {
  if (count <= 2) return "grid-cols-1 sm:grid-cols-2";
  if (count <= 4) return "grid-cols-2";
  if (count <= 9) return "grid-cols-3";
  return "grid-cols-4";
};

function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const {
    produce,
    remoteStreams,
    toggleMute,
    isMuted,
    toggleCamera,
    isCameraOff,
    startScreenShare,
    stopScreenShare,
    isScreenSharing,
  } = useMediasoup(roomId || "default-room", localStream);

  useEffect(() => {
    if (!roomId) return;

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((mediaStream) => {
        mediaStream.getAudioTracks()[0].enabled = false;
        mediaStream.getVideoTracks()[0].enabled = false;
        setLocalStream(mediaStream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = mediaStream;
        }
      })
      .catch((err) => console.error("Error accessing media devices", err));
  }, [roomId]);

  useEffect(() => {
    if (localStream) {
      produce();
    }
  }, [localStream, produce]);

  const participantCount = remoteStreams.length + 1;
  const gridLayout = useMemo(
    () => getGridClasses(participantCount),
    [participantCount]
  );

  const handleToggleScreenShare = () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  };

  const handleHangUp = () => {
    navigate("/");
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white">
      <header className="flex-shrink-0 px-4 py-3 border-b border-neutral-800">
        <h1 className="text-lg font-medium tracking-tight">
          Room: <span className="text-neutral-300 font-mono">{roomId}</span>
        </h1>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 min-h-0">
        <div className={`grid gap-3 w-full h-full max-w-6xl ${gridLayout}`}>
          <div className="relative bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover aspect-video ${
                isCameraOff ? "invisible" : ""
              }`}
            />
            {isCameraOff && (
              <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
                <span className="text-neutral-500 text-sm">Camera off</span>
              </div>
            )}
            <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-black/70 rounded-md text-xs text-neutral-300">
              You {isMuted && "(Muted)"}
            </div>
          </div>

          {remoteStreams.map(({ id, stream }) => (
            <div
              key={id}
              className="relative bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden"
            >
              <video
                autoPlay
                playsInline
                className="w-full h-full object-cover aspect-video"
                ref={(video) => {
                  if (video) video.srcObject = stream;
                }}
              />
              <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-black/70 rounded-md text-xs text-neutral-400">
                Remote
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="flex-shrink-0 px-4 py-4 border-t border-neutral-800 flex items-center justify-center gap-3">
        <button
          onClick={toggleMute}
          className={`p-3.5 rounded-full transition-colors ${
            isMuted
              ? "bg-neutral-600 text-white hover:bg-neutral-500"
              : "bg-white text-black hover:bg-neutral-200"
          }`}
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
        <button
          onClick={toggleCamera}
          className={`p-3.5 rounded-full transition-colors ${
            isCameraOff
              ? "bg-neutral-600 text-white hover:bg-neutral-500"
              : "bg-white text-black hover:bg-neutral-200"
          }`}
          aria-label={isCameraOff ? "Turn camera on" : "Turn camera off"}
        >
          {isCameraOff ? <VideoOff size={20} /> : <Video size={20} />}
        </button>
        <button
          onClick={handleToggleScreenShare}
          className={`p-3.5 rounded-full transition-colors ${
            isScreenSharing
              ? "bg-neutral-600 text-white hover:bg-neutral-500"
              : "bg-white text-black hover:bg-neutral-200"
          }`}
          aria-label={isScreenSharing ? "Stop sharing" : "Share screen"}
        >
          {isScreenSharing ? (
            <ScreenShareOff size={20} />
          ) : (
            <ScreenShare size={20} />
          )}
        </button>
        <button
          onClick={handleHangUp}
          className="p-3.5 rounded-full bg-white text-black hover:bg-neutral-200 active:bg-neutral-300 transition-colors"
          aria-label="Leave call"
        >
          <PhoneOff size={20} />
        </button>
      </footer>
    </div>
  );
}

export default Room;
