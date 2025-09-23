import express from "express"
import { Server } from "socket.io"
import http from "http"
import * as mediasoup from "mediasoup"
const app = express()
const server = http.createServer(app)
// worker and router declared
export let worker: mediasoup.types.Worker<mediasoup.types.AppData>;
let router: mediasoup.types.Router<mediasoup.types.AppData>;
let producerTransport: mediasoup.types.Transport<mediasoup.types.AppData> | undefined;
let producer: any;
let consumer: any;
let consumerTransport: mediasoup.types.Transport<mediasoup.types.AppData> | undefined;
// let producer
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
// worker intialized
(async () => {
  worker = await mediasoup.createWorker({
    rtcMaxPort: 2020,
    rtcMinPort: 2000
  })
  worker.on('died', error => {
    // This implies something serious happened, so kill the application
    console.error('mediasoup worker has died')
    setTimeout(() => process.exit(1), 2000) // exit in 2 seconds
  })
})()
async function createWebTransport(callback: any) {
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
    }
    let transport = await router.createWebRtcTransport(webrtcTransportOption)
    console.log("transport Id is ", transport.id)

    transport.on('dtlsstatechange', dtlsState => {
      if (dtlsState === "closed") {
        transport.close()
      }
    })
    transport.on('@close', () => {
      transport.close()
    })
    callback({
      params: {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters
      }
    })
    // console.log(transport)
    return transport
  } catch (err) {
    console.log(err)
  }
}
io.on("connection", async (socket) => {
  console.log(socket.id)
  if (!router) {

    router = await worker.createRouter({ mediaCodecs })
  }
  // socket.on("join-room", ({ roomId }: { roomId: string }) => {
  //   console.log('join-rooom is working', roomId)
  // })
  socket.on("get", (callback) => {
    console.log("get-called")
    const rtpCapabilities = router.rtpCapabilities
    // console.log(rtpCapabilities)
    // socket.emit("rtpCapabilities", rtpCapabilities)
    callback({ rtpCapabilities })
  })
  socket.on("createWebrtcTransport", async ({ sender }, callback) => {
    console.log("is this a sender", sender)
    if (sender) {
      producerTransport = await createWebTransport(callback)
    }
    else {
      consumerTransport = await createWebTransport(callback)
    }
  })
  socket.on("transport-connect", async ({ dtlsParameters }, callback) => {
    // console.log(dtlsParameter, "transport-connect")
    // console.log('dtls Params', dtlsParameter)
    if (producerTransport) {
      console.log("dtls calling")
      await producerTransport?.connect({ dtlsParameters })
      callback()
      console.log("worked")
    }
  })
  socket.on('consume', async ({ rtpCapabilities }, callback) => {
    try {
      if (router.canConsume({
        producerId: producer.id,
        rtpCapabilities
      })) {
        consumer = await consumerTransport?.consume({
          producerId: producer.id,
          rtpCapabilities,
          paused: true
        })
        consumer.on('transportclose', () => {
          console.log("transport closed")
        })
        consumer.on("producerclose", () => {
          console.log("producer of conusmed closed")
        })
        const params = {
          id: consumer.id,
          producerId: producer.id,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters
        }
        callback({ params })

      }
    } catch (err) {
      console.log(err)
      callback({
        params: {
          error: err
        }
      })
    }
  })
  socket.on("consumer-resume", async () => {
    console.log("consumer resume")
    await consumer.resume()
  })
  socket.on("transport-recv-connect", async ({ dtlsParameters }) => {
    console.log(dtlsParameters)
    await consumerTransport?.connect({ dtlsParameters })
    console.log("recv working")
  })
  socket.on("transport-produce", async ({ transportId, kind, rtpParameters, appData }, callback) => {
    console.log("transport-producer")
    // console.log(transportId)
    if (!producerTransport) return;
    producer = await producerTransport.produce({
      kind, rtpParameters, appData
    })
    console.log("produce from server")
    producer.on("transportclose", () => {
      console.log("transport-producer close")
      producer.close()
    })
    callback({ id: producer.id })
  })
})

app.use(express.json())

server.listen(3000)
//mediaCodecs init
const mediaCodecs: mediasoup.types.RtpCodecCapability[] = [
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



