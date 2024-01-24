import React, {useState, useRef, useEffect} from 'react';
import {ChakraProvider, Box, Button, Container, Stack, Select, Text, Textarea, CircularProgress} from '@chakra-ui/react'
import { FaMicrophone, FaFileUpload, FaStopCircle } from "react-icons/fa";

import './App.css';
import logo from'./forwardit-logo-white-red.png';
const sample = require("./lr1-laika-zinas.ogg");

function App() {
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);

    const [recordingTime, setRecordingTime] = useState(0); // in seconds
    const recordingTimerRef = useRef<NodeJS.Timer | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [selectedSample, setSelectedSample] = useState<string>("");
    const [audioData, setAudioData] = useState<string | undefined>();

    const [language, setLanguage] = React.useState("");
    const [transcript, setTranscript] = React.useState("");
    const startRecording = async () => {
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

    useEffect(() => {
        const transcribeAudio = async (audioSource: string) => {
            try {
                let audioBlob: Blob | undefined;

                const response = await fetch(audioSource);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                audioBlob = await response.blob();

                // Convert the Blob to base64
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    const base64Audio = reader.result as string;
                    if(base64Audio) {
                        setIsTranscribing(true);
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
                            setTranscript(data[1]);
                            setLanguage(data[0]);
                        }).finally(() => {
                            setIsTranscribing(false);
                        })
                    }
                };
            } catch (error) {
                console.error('Error sending audio to server:', error);
            }
        };

        if (audioData) {
            transcribeAudio(audioData);
        }
    }, [audioData, language]);


  return (
      <ChakraProvider>
          <div className="app">
                <header className="app-header">
                    <Container>
                        <Stack direction="column" spacing={6} align={"center"} w={"100%"}>
                            <Stack direction="column" spacing={1} align={"center"}>
                                <Box><img src={logo} className="app-logo" alt={"logo"}/></Box>
                                <Text fontSize="sm">Audio Transcription Services</Text>
                            </Stack>
                            <Box w="100%" bg="#191A21FF" p={6} pb={4}  borderRadius='lg' overflow='hidden'>
                                <Stack direction="column" spacing={6} align={"center"}>
                                    <Text fontSize={"md"} fontWeight={"bold"}>1. Select a sample or upload your own audio file</Text>
                                    <Stack direction="column" spacing={1} align="center" w={"100%"}>
                                        <Text fontSize="sm">Select a sample:</Text>
                                        <Select
                                            isDisabled={isRecording || isTranscribing}
                                            value={selectedSample}
                                            size='md'
                                            onChange={handleSampleChange}>
                                            <option value={""}>None</option>
                                            <option value={sample}>Latvian Radio: Weather Forecast</option>
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
                                    <Stack direction={"column"} spacing={4} align={"center"} w={"100%"}>
                                        {isRecording && <Text fontSize='4xl'>{formatTime(recordingTime)}</Text>}
                                    </Stack>
                                </Stack>
                            </Box>
                            <Box w="100%" bg="#191A21FF" p={6} borderRadius='lg' overflow='hidden'>
                                <Stack direction="column" spacing={6} align={"center"}>
                                    <Text fontSize={"md"} fontWeight={"bold"}>2. Get transcription and summary within seconds</Text>
                                    {audioData && <audio src={audioData} controls />}
                                    {isTranscribing && <CircularProgress isIndeterminate color={"#e33832"}/>}
                                    {!isTranscribing && transcript.length && (
                                        <Textarea
                                            variant='outline'
                                            placeholder='Filled'
                                            value={transcript}
                                            size={"md"}
                                            readOnly
                                        />
                                    )}
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
