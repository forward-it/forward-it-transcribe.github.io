import React, {useState, useRef, useEffect} from 'react';
import {ChakraProvider, Box, Button, Container, Stack, Select, Text, CircularProgress} from '@chakra-ui/react'
import { FaMicrophone, FaFileUpload, FaStopCircle } from "react-icons/fa";

import './App.css';
import logo from'./forwardit-logo-white-red.png';
import {AutoResizeTextarea} from "./components/AutoResizeTextArea";
const sampleLV = require("./samples/LV-woman.mp3");
const sampleLVParliament = require("./samples/LV-parliament.mp3");
const sampleLVRadio = require("./samples/LV-radio.mp4");
const sampleEN = require("./samples/EN-voicemail.mp3");


function App() {
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);

    const [recordingTime, setRecordingTime] = useState(0); // in seconds
    const [transcribingTimeRemaining, setTranscribingTimeRemaining] = useState(0); // in seconds

    const recordingTimerRef = useRef<NodeJS.Timer | null>(null);
    const transcribingTimerRef = useRef<NodeJS.Timer | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const [selectedSample, setSelectedSample] = useState<string>("");
    const [audioData, setAudioData] = useState<string | undefined>();

    const [transcribingError, setTranscribingError] = useState<string | undefined>();
    const [duration, setDuration] = useState<number>(0);
    const [transcript, setTranscript] = React.useState("Hi, this is Stephanie. I'm calling from Linux World and Network World Conference and Expo,  also hosting the Smalltalk Solutions Conference. The trade show opens tomorrow, and we're really  excited you're registered to attend. Just to remind you, the trade show is at the Metro  Toronto Convention Centre in the North Building on Front Street. Tomorrow at 9.45 a.m., begins  IBM's one-hour keynote, which is a definite must-see. And then the trade show floor opens  up at 11 a.m. until 6 p.m. On Wednesday, the opening keynote is Samsung at 9.45 a.m., and  the floor hours are 11 to 5 p.m. Both days are packed with great exhibit features. If  you didn't receive your badge in the mail, make sure when you arrive to have your ID  to pick up your badge before entering the 20,000-square-foot exhibit floor. Don't forget  your comfortable shoes. Thanks again for registering, and we wish you a wonderful time at the show.");

    const startRecording = async () => {
        setTranscribingError(undefined);
        setSelectedSample("");
        setAudioData(undefined);
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        mediaRecorderRef.current.ondataavailable = (e) => {
            setAudioData(URL.createObjectURL(e.data));
        };
        mediaRecorderRef.current.start();
        recordingTimerRef.current = setInterval(() => {
            setRecordingTime((prevTime) => prevTime + 1);
        }, 1000);
        setIsRecording(true);
    }


    const stopRecording = () => {
        if(mediaRecorderRef.current?.stream) {
            mediaRecorderRef.current.stream.getTracks()[0].stop()
        }
        if(recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
        }
        setIsRecording(false);
        setRecordingTime(0);
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    };

    const triggerFileInput = () => {
        setSelectedSample("");
        if(fileInputRef.current) {
            fileInputRef.current.click();
        }
    }

    const handleFileUpload = (event: any) => {
        const file = event.target.files[0];
        if (file) {
            setAudioData(URL.createObjectURL(file));
            // Reset duration each time a new file is uploaded
            setDuration(0);
        }
    };

    const onLoadedMetadata = () => {
        if (audioRef.current) {
            const newDuration = Math.round(audioRef.current.duration);
            if (newDuration > 0 && newDuration !== Infinity) {
                setDuration(newDuration);
            } else {
                setDuration(0);
            }
        }
    };

    const handleSampleChange = (event: any) => {
        if(event.target.value.length) {
            setAudioData(event.target.value);
            setSelectedSample(event.target.value)
        } else {
            setAudioData(undefined);
            setSelectedSample("");
        }
    };

    const startCountdown = () => {
        clearCountdown(); // Clear any existing interval
        transcribingTimerRef.current = setInterval(() => {
            setTranscribingTimeRemaining((prevTime) => {
                if (prevTime > 0) return prevTime - 1;
                clearCountdown();
                return 0;
            });
        }, 1000);
    }

    const clearCountdown = () => {
        if(transcribingTimerRef.current) {
            clearInterval(transcribingTimerRef.current);
        }
    }

    useEffect(() => setTranscribingTimeRemaining(duration + 20), [duration])

    useEffect(() => {
        const transcribeAudio = async (audioSource: string) => {
            try {
                setTranscribingError(undefined);
                let audioBlob: Blob | undefined;

                const response = await fetch(audioSource);
                if (!response.ok) setTranscribingError(`HTTP error: ${response.status}`);
                audioBlob = await response.blob();

                // Convert the Blob to base64
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    const base64Audio = reader.result as string;
                    if(base64Audio) {
                        setIsTranscribing(true);
                        if(transcribingTimeRemaining > 0) {
                            startCountdown();
                        }
                        fetch("https://api.forwardit.lv/demo/transcribe", {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              data: `data:audio/ogg;base64,${base64Audio.split(',')[1]}`
                            })
                        }).then(response => {
                            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                            return response.json();
                        }).then(data => {
                            setTranscript(data.text.startsWith(" ") ? data.text.substring(1) : data.text);
                        }).catch(error => {
                            setTranscribingError(error?.message || "Demo page is not working at the moment. Please try again later")
                        }).finally(() => {
                            setIsTranscribing(false);
                            setTranscribingTimeRemaining(0)
                        })
                    }
                };
            } catch (error) {
                console.error('Error sending audio to server:', error);
            }
        };

        if (audioData) {
            if(duration > 300) {
                setTranscribingError("Audio file is too long. Please choose a shorter file");
            } else {
                transcribeAudio(audioData);
            }
        }
    }, [audioData, duration]);

    return (
      <ChakraProvider>
          <div className="app">
                <header className="app-header">
                    <Container>
                        <Stack direction="column" spacing={6} align={"center"} w={"100%"}>
                            <Stack direction="column" spacing={1} align={"center"}>
                                <Box><img src={logo} className="app-logo" alt={"logo"}/></Box>
                                <Text fontSize="sm">Audio Transcription Demo</Text>
                            </Stack>
                            <Box w="100%" bg="#191A21FF" p={6} pb={4}  borderRadius='lg' overflow='hidden'>
                                <Stack direction="column" spacing={6} align={"center"}>
                                    <Text fontSize={"md"} fontWeight={"bold"}>1. Choose audio file*</Text>
                                    <Stack direction="column" spacing={1} align="center" w={"100%"}>
                                        <Text fontSize="sm">Select a sample:</Text>
                                        <Select
                                            isDisabled={isRecording || isTranscribing}
                                            value={selectedSample}
                                            size='md'
                                            onChange={handleSampleChange}>
                                            <option value={""}>None</option>
                                            <option value={sampleLV}>LV: Woman Speaking</option>
                                            <option value={sampleLVParliament}>LV: Parliament Session Opening</option>
                                            <option value={sampleLVRadio}>LV: Latvian Radio Weather Forecast</option>
                                            <option value={sampleEN}>EN: Voicemail Recording</option>
                                        </Select>
                                    </Stack>
                                    <Stack direction="row" spacing={4} align="center">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            accept="audio/*"
                                            onChange={handleFileUpload}
                                            style={{ display: 'none' }}
                                        />
                                        <Button
                                            leftIcon={<FaFileUpload/>}
                                            isDisabled={isRecording || isTranscribing}
                                            onClick={triggerFileInput}
                                        >
                                            Upload
                                        </Button>
                                        <Text fontSize="md">or</Text>
                                        <Button
                                            leftIcon={isRecording ? <FaStopCircle/> : <FaMicrophone/>}
                                            isDisabled={isTranscribing}
                                            onClick={isRecording ? stopRecording : startRecording}>{isRecording ? "Stop" : "Record"}
                                        </Button>
                                    </Stack>
                                    {isRecording && <Text fontSize='4xl'>{formatTime(recordingTime)}</Text>}
                                    <Text fontSize={"xs"}>* Demo page allows transcribing up to 5 minute long records</Text>

                                </Stack>
                            </Box>
                            <Box w="100%" bg="#191A21FF" p={6} borderRadius='lg' overflow='hidden'>
                                <Stack direction="column" spacing={6} align={"center"}>
                                    <Text fontSize={"md"} fontWeight={"bold"}>2. Get transcription</Text>
                                    {audioData && <audio src={audioData} ref={audioRef} onLoadedMetadata={onLoadedMetadata}
                                                         controls />}
                                    {isTranscribing && (
                                        <Stack direction={"column"} align={"center"}>
                                            <CircularProgress isIndeterminate color={"#e33832"}/>
                                            <Text fontSize={"sm"} pt={2}>Please wait while we transcribe your audio. {duration ? "Approximate time remaining:" : ""}</Text>
                                            {duration && <Text fontSize='2xl'>{transcribingTimeRemaining > 0 ? formatTime(transcribingTimeRemaining) : "very soon"}</Text>}
                                        </Stack>
                                    )}
                                    {!isTranscribing && transcript.length && (
                                        <AutoResizeTextarea
                                            value={transcript}
                                        />
                                    )}
                                    {transcribingError && <Text fontSize={"sm"} color={"red"}>{transcribingError}</Text>}
                                </Stack>
                            </Box>
                        </Stack>
                    </Container>
                </header>
              <footer className="app-footer">
                  <p>© 2024 Forward IT Consulting SIA</p>
            </footer>
        </div>
      </ChakraProvider>
  );
}

export default App;