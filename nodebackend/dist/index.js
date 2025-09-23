"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.worker = void 0;
const express_1 = __importDefault(require("express"));
const socket_io_1 = require("socket.io");
const http_1 = __importDefault(require("http"));
const mediasoup = __importStar(require("mediasoup"));
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
let router;
let producerTransport;
let producer;
let consumer;
let consumerTransport;
// let producer
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
// worker intialized
(() => __awaiter(void 0, void 0, void 0, function* () {
    exports.worker = yield mediasoup.createWorker({
        rtcMaxPort: 2020,
        rtcMinPort: 2000
    });
    exports.worker.on('died', error => {
        // This implies something serious happened, so kill the application
        console.error('mediasoup worker has died');
        setTimeout(() => process.exit(1), 2000); // exit in 2 seconds
    });
}))();
function createWebTransport(callback) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const webrtcTransportOption = {
                listenIps: [
                    {
                        ip: '0.0.0.0',
                        announcedIp: '127.0.0.1'
                    }
                ],
                enableTcp: true,
                enableUdp: true,
                preferUdp: true
            };
            let transport = yield router.createWebRtcTransport(webrtcTransportOption);
            console.log("transport Id is ", transport.id);
            transport.on('dtlsstatechange', dtlsState => {
                if (dtlsState === "closed") {
                    transport.close();
                }
            });
            transport.on('@close', () => {
                transport.close();
            });
            callback({
                params: {
                    id: transport.id,
                    iceParameters: transport.iceParameters,
                    iceCandidates: transport.iceCandidates,
                    dtlsParameters: transport.dtlsParameters
                }
            });
            // console.log(transport)
            return transport;
        }
        catch (err) {
            console.log(err);
        }
    });
}
io.on("connection", (socket) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(socket.id);
    if (!router) {
        router = yield exports.worker.createRouter({ mediaCodecs });
    }
    // socket.on("join-room", ({ roomId }: { roomId: string }) => {
    //   console.log('join-rooom is working', roomId)
    // })
    socket.on("get", (callback) => {
        console.log("get-called");
        const rtpCapabilities = router.rtpCapabilities;
        // console.log(rtpCapabilities)
        // socket.emit("rtpCapabilities", rtpCapabilities)
        callback({ rtpCapabilities });
    });
    socket.on("createWebrtcTransport", (_a, callback_1) => __awaiter(void 0, [_a, callback_1], void 0, function* ({ sender }, callback) {
        console.log("is this a sender", sender);
        if (sender) {
            producerTransport = yield createWebTransport(callback);
        }
        else {
            consumerTransport = yield createWebTransport(callback);
        }
    }));
    socket.on("transport-connect", (_a, callback_1) => __awaiter(void 0, [_a, callback_1], void 0, function* ({ dtlsParameters }, callback) {
        // console.log(dtlsParameter, "transport-connect")
        // console.log('dtls Params', dtlsParameter)
        if (producerTransport) {
            console.log("dtls calling");
            yield (producerTransport === null || producerTransport === void 0 ? void 0 : producerTransport.connect({ dtlsParameters }));
            callback();
            console.log("worked");
        }
    }));
    socket.on('consume', (_a, callback_1) => __awaiter(void 0, [_a, callback_1], void 0, function* ({ rtpCapabilities }, callback) {
        try {
            if (router.canConsume({
                producerId: producer.id,
                rtpCapabilities
            })) {
                consumer = yield (consumerTransport === null || consumerTransport === void 0 ? void 0 : consumerTransport.consume({
                    producerId: producer.id,
                    rtpCapabilities,
                    paused: true
                }));
                consumer.on('transportclose', () => {
                    console.log("transport closed");
                });
                consumer.on("producerclose", () => {
                    console.log("producer of conusmed closed");
                });
                const params = {
                    id: consumer.id,
                    producerId: producer.id,
                    kind: consumer.kind,
                    rtpParameters: consumer.rtpParameters
                };
                callback({ params });
            }
        }
        catch (err) {
            console.log(err);
            callback({
                params: {
                    error: err
                }
            });
        }
    }));
    socket.on("consumer-resume", () => __awaiter(void 0, void 0, void 0, function* () {
        console.log("consumer resume");
        yield consumer.resume();
    }));
    socket.on("transport-recv-connect", (_a) => __awaiter(void 0, [_a], void 0, function* ({ dtlsParameters }) {
        console.log(dtlsParameters);
        yield (consumerTransport === null || consumerTransport === void 0 ? void 0 : consumerTransport.connect({ dtlsParameters }));
        console.log("recv working");
    }));
    socket.on("transport-produce", (_a, callback_1) => __awaiter(void 0, [_a, callback_1], void 0, function* ({ transportId, kind, rtpParameters, appData }, callback) {
        console.log("transport-producer");
        // console.log(transportId)
        if (!producerTransport)
            return;
        producer = yield producerTransport.produce({
            kind, rtpParameters, appData
        });
        console.log("produce from server");
        producer.on("transportclose", () => {
            console.log("transport-producer close");
            producer.close();
        });
        callback({ id: producer.id });
    }));
}));
app.use(express_1.default.json());
server.listen(3000);
//mediaCodecs init
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
