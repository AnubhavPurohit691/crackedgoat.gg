import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import * as mediasoup from "mediasoup-client"
import "./App.css"
export const socket = io("http://localhost:3000")
const produceParams = {
  // mediasoup params
  encodings: [
    {
      rid: 'r0',
      maxBitrate: 100000,
      scalabilityMode: 'S1T3',
    },
    {
      rid: 'r1',
      maxBitrate: 300000,
      scalabilityMode: 'S1T3',
    },
    {
      rid: 'r2',
      maxBitrate: 900000,
      scalabilityMode: 'S1T3',
    },
  ],
  // https://mediasoup.org/documentation/v3/mediasoup-client/api/#ProducerCodecOptions
  codecOptions: {
    videoGoogleStartBitrate: 1000
  }
}
function App() {
  let producer
  const videoRef = useRef<HTMLVideoElement>(null)
  const remoteRef = useRef<HTMLVideoElement>(null)
  const [rtpCapabilities, setrtpCapabilities] = useState<any>()
  const [stream, setstream] = useState<MediaStream | null>(null)
  const [producerTransport, setproducerTransport] = useState<any>()
  const [consumerTransport, setconsumerTransport] = useState<any>()
  const [newDevice, setnewDevice] = useState<any>()
  const getLocalVideo = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      })
      setstream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (error) {
      console.log(error)
    }
  }
  function handlertpCapabilities() {
    socket.emit("get", (data: any) => {
      setrtpCapabilities(data.rtpCapabilities)
    })
  }
  async function handlecreateDevice() {
    console.log("getting into Device")
    try {
      let device = new mediasoup.Device()
      console.log(rtpCapabilities)
      await device.load({ routerRtpCapabilities: rtpCapabilities })
      console.log("device loaded")
      setnewDevice(device)
    } catch (err) {
      console.log(err)
    }
  }
  function handlecreaterecvTransport() {
    console.log("in handle create recv")
    socket.emit('createWebrtcTransport', { sender: false }, ({ params }: { params: any }) => {
      if (params.error) {
        console.log(params.error)
        return
      }
      // console.log(params)
      const cTransport = newDevice.createRecvTransport(params)
      setconsumerTransport(cTransport)
      console.log("ctransport declared")
      cTransport.on('connect', async ({ dtlsParameters }: { dtlsParameters: any }, callback: any, errback: any) => {
        try {
          socket.emit("transport-recv-connect", { dtlsParameters })
          console.log("createrecv working")
          callback(console.log("ctransport declared"))
        } catch (err) {
          errback(err)
        }
      })
    })

  }
  async function handleconnectrecvTransport() {
    socket.emit("consume", { rtpCapabilities }, async ({ params }: { params: any }) => {
      if (params.error) {
        console.log("error")
      }
      console.log(params)
      const consumer = await consumerTransport.consume({
        id: params.id,
        producerId: params.producerId,
        kind: params.kind,
        rtpParameters: params.rtpParameters
      })
      const { track } = consumer
      if (remoteRef.current) {
        const remoteStream = new MediaStream([track])
        remoteRef.current.srcObject = remoteStream
      }
      socket.emit("consumer-resume")
    })
  }
  async function handleconnectTransport() {
    console.log("handleconnect called")

    if (!producerTransport) {
      console.error(" No producerTransport created yet")
      return
    }

    const videoTrack = stream?.getVideoTracks()[0]
    if (!videoTrack) {
      console.error("No video track, did you click 'Get Local Video'?")
      return
    }

    try {
      producer = await producerTransport.produce({
        track: videoTrack,
      })
      console.log(" producer created client-side:", producer.id)
    } catch (err) {
      console.error(" error while producing:", err)
    }
  } function handlecreateTransport() {

    socket.emit("createWebrtcTransport", { sender: true }, ({ params }: { params: any }) => {
      if (params.error) {
        console.log("error", params.error)
      }
      let ptransport;

      ptransport = newDevice.createSendTransport(params)
      setproducerTransport(ptransport)
      console.log("ptransport declared")
      ptransport.on("connect", async ({ dtlsParameters }: { dtlsParameters: any }, callback: any, errback: any) => {
        try {
          socket.emit("transport-connect", { dtlsParameters }, () => {
            callback()
          })
          console.log("emit worked")
        } catch (err) {
          errback(err)
        }
      })
      ptransport.on("produce", async (parameter: any, callback: any, errback: any) => {
        console.log("produceing wokring ")

        try {
          socket.emit("transport-produce", {
            transportId: ptransport.id,
            kind: parameter.kind,
            rtpParameters: parameter.rtpParameters,
            appData: parameter.appData
          }, ({ id }: { id: any }) => {
            callback({ id })
          })
          console.log("callbackworking")
        } catch (err) {
          errback(err)
        }
      })
    })
  }
  useEffect(() => {
    socket.connect()
    // socket.on("rtpCapabilities", async (rtpCapabilities) => {
    //   console.log("this is rtp ", rtpCapabilities)
    //   try {
    //     const newDevice = new mediasoup.Device()
    //     await newDevice.load({ routerRtpCapabilities: rtpCapabilities })
    //   } catch (err) {
    //     console.log(err)
    //   }
    //
    // })

    return () => {
      socket.disconnect()
    }
  }, [socket])
  return (
    <>
      <div id='video'>
        <table>
          <thead>
            <tr>
              <th>localvideo</th>
              <th>remote video</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div id='sharedBtns'>
                  <video
                    id='localVideo'
                    autoPlay
                    className='video'
                    ref={videoRef}
                    muted
                  />
                </div>

              </td>
              <td>
                <div id='sharedBtns'>
                  <video ref={remoteRef} id='localVideo' autoPlay className='video' />
                </div>
              </td>
            </tr>

            <tr>
              <td>
                <div className='sharedBtns'>
                  <button id='btnLocalVideo' onClick={getLocalVideo}>Get Local Video</button>
                </div>
              </td>
            </tr>
            <tr>
              <td colSpan={2}>
                <div className='sharedBtns'>
                  <button id='btnRtpCapabilities' onClick={handlertpCapabilities}>Get rtp Capabilties</button>
                  <br />
                  <button id='btnDevice' onClick={handlecreateDevice}>Create Device</button>
                </div>
              </td>
            </tr>
            <tr>
              <td>
                <div className="sharedBtns">
                  <button id="btnCreateSendTransport" onClick={handlecreateTransport}>
                    4. Create Send Transport
                  </button>
                  <br />
                  <button id="btnConnectSendTransport" onClick={handleconnectTransport}>
                    5. Connect Send Transport & Produce
                  </button>
                </div>
              </td>
              <td>
                <div className="sharedBtns">
                  <button id="btnRecvSendTransport" onClick={handlecreaterecvTransport}>
                    6. Create Recv Transport
                  </button>
                  <br />
                  <button id="btnConnectRecvTransport" onClick={handleconnectrecvTransport}>
                    7. Connect Recv Transport & Consume
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  )
}

export default App
