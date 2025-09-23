"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWorker = exports.worker = void 0;
exports.handleio = handleio;
const mediasoup_1 = __importDefault(require("mediasoup"));
let router;
const mediaCodecs = [
    {
        kind: "audio",
        mimeType: "audio/opus",
        clockRate: 48000,
        channels: 2,
        preferredPayloadType: 96,
        rtcpFeedback: [{ type: "nack" }, { type: "nack", parameter: "pli" }],
    },
    {
        kind: "video",
        mimeType: "video/H264",
        clockRate: 90000,
        preferredPayloadType: 97,
        parameters: {
            "packetization-mode": 1,
            "profile-level-id": "42e01f",
            "level-asymmetry-allowed": 1,
        },
        rtcpFeedback: [
            { type: "nack" },
            { type: "nack", parameter: "pli" },
            { type: "ccm", parameter: "fir" },
            { type: "goog-remb" },
        ],
    },
];
const createWorker = () => __awaiter(void 0, void 0, void 0, function* () {
    exports.worker = yield mediasoup_1.default.createWorker({
        rtcMaxPort: 2020,
        rtcMinPort: 2000
    });
    console.log(`worker pid ${exports.worker.pid}`);
    exports.worker.on('died', error => {
        // This implies something serious happened, so kill the application
        console.error('mediasoup worker has died');
        setTimeout(() => process.exit(1), 2000); // exit in 2 seconds
    });
    return exports.worker;
});
exports.createWorker = createWorker;
function handleio(io) {
    (() => __awaiter(this, void 0, void 0, function* () {
        exports.worker = yield (0, exports.createWorker)();
    }))();
    io.on("connection", (socket) => __awaiter(this, void 0, void 0, function* () {
        console.log(socket.id);
        router = yield exports.worker.createRouter({ mediaCodecs });
        socket.on("join-room", ({ roomId }) => {
            console.log('join-rooom is working', roomId);
        });
        socket.on("getrtpCapablities", (callback) => {
            const rtpCapabilites = router.rtpCapabilities;
            console.log(rtpCapabilites);
            callback({ rtpCapabilites });
        });
    }));
}
