import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Lobby() {
  const [roomId, setRoomId] = useState("");
  const navigate = useNavigate();

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim() !== "") {
      navigate(`/room/${roomId.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-sm flex flex-col items-center">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white mb-2">
          Video Chat
        </h1>
        <p className="text-neutral-400 text-sm mb-8">
          Enter a room ID to join or create a call
        </p>

        <form
          onSubmit={handleJoinRoom}
          className="flex flex-col gap-4 w-full"
        >
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Room ID"
            className="w-full px-4 py-3.5 bg-neutral-950 border border-neutral-700 rounded-lg text-white placeholder:text-neutral-500 focus:border-white focus:ring-1 focus:ring-white transition-colors"
            required
          />
          <button
            type="submit"
            className="w-full py-3.5 bg-white text-black font-medium rounded-lg hover:bg-neutral-200 active:bg-neutral-300 transition-colors"
          >
            Join Room
          </button>
        </form>
      </div>
    </div>
  );
}

export default Lobby;
