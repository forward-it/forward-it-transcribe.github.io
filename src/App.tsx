import React, {useState, useRef, useEffect} from 'react';
import {ChakraProvider, Box, Button, Container, Stack, Select, Text, CircularProgress} from '@chakra-ui/react'
import { FaMicrophone, FaFileUpload, FaStopCircle } from "react-icons/fa";

import './App.css';
import logo from'./forwardit-logo-white-red.png';
import {AutoResizeTextarea} from "./components/AutoResizeTextArea";
const sampleLV = require("./samples/LV-woman.mp3");
const sampleLVParliament = require("./samples/LV-parliament.mp3");
const sampleLVRadio = require("./samples/LV-radio.ogg");
const sampleEN = require("./samples/EN-voicemail.mp3");


function App() {
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);

    const [recordingTime, setRecordingTime] = useState(0); // in seconds

    const [audioFile, setAudioFile] = useState<File | null>(null); // Updated state to store the file object

    const recordingTimerRef = useRef<NodeJS.Timer | null>(null);
    const transcribingTimerRef = useRef<NodeJS.Timer | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const [selectedSample, setSelectedSample] = useState<string>("");
    const [audioData, setAudioData] = useState<string | undefined>();

    const [transcribingError, setTranscribingError] = useState<string | undefined>();
    const [duration, setDuration] = useState<number>(0);
    const [transcript, setTranscript] = React.useState("");

    const startRecording = async () => {
        setTranscribingError(undefined);
        setSelectedSample("");
        setAudioData(undefined);
        setAudioFile(null); // Ensure audioFile state is reset

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        const recordedChunks: any[] = []; // Store recorded chunks here

        mediaRecorderRef.current.ondataavailable = (e) => {
            if (e.data.size > 0) {
                recordedChunks.push(e.data);
            }
        };

        mediaRecorderRef.current.onstop = () => {
            // Convert recorded chunks to a single Blob
            const audioBlob = new Blob(recordedChunks, { type: 'audio/webm' });
            setAudioData(URL.createObjectURL(audioBlob)); // For playback
            setAudioFile(new File([audioBlob], "recording.webm", { type: 'audio/webm' })); // Prepare for upload
        };

        mediaRecorderRef.current.start();
        recordingTimerRef.current = setInterval(() => {
            setRecordingTime((prevTime) => prevTime + 1);
        }, 1000);
        setIsRecording(true);
    };

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
            setAudioFile(file); // Update to store file object
            setAudioData(URL.createObjectURL(file)); // For local playback only
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

    const handleSampleChange = async (event: any) => {
        const selectedURL = event.target.value;
        if (selectedURL) {
            // Fetch the audio file from the URL
            try {
                const response = await fetch(selectedURL);
                if (!response.ok) throw new Error('Network response was not ok.');
                const blob = await response.blob();

                // Create a File object from the Blob
                const file = new File([blob], "sampleAudio", { type: blob.type });

                setAudioFile(file); // Now you have a File object to send to the server
                setAudioData(URL.createObjectURL(blob)); // For local playback

                setSelectedSample(selectedURL);
                setDuration(0);
            } catch (error) {
                console.error('Error fetching audio file:', error);
                setTranscribingError('Failed to fetch audio file.');
            }
        } else {
            setAudioData(undefined);
            setSelectedSample("");
            setAudioFile(null); // Reset or clear the file state
        }
    };

    const clearCountdown = () => {
        if(transcribingTimerRef.current) {
            clearInterval(transcribingTimerRef.current);
        }
    }

    useEffect(() => {
        const transcribeAudio = async (audioData: string) => {
            try {
                setTranscribingError(undefined);
                const response = await fetch(audioData);
                if (!response.ok) setTranscribingError(`HTTP error: ${response.status}`);
                const audioBlob = await response.blob();

                const formData = new FormData();
                formData.append("file", audioBlob, "audioFile.ogg");

                setIsTranscribing(true);

                fetch("https://api.forwardit.lv/demo/transcribe", {
                    method: 'POST',
                    body: formData,
                }).then(response => {
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    return response.json();
                }).then(data => {
                    setTranscript(data.text.startsWith(" ") ? data.text.substring(1) : data.text);
                }).catch(error => {
                    setTranscribingError(error?.message || "Demo page is not working at the moment. Please try again later");
                }).finally(() => {
                    setIsTranscribing(false);
                });
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
    }, [audioData]);

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
                                            <option value={sampleLV}>LV: Woman Speaking (8 sec)</option>
                                            <option value={sampleLVParliament}>LV: Parliament Session Opening (14 sec)</option>
                                            <option value={sampleLVRadio}>LV: Latvian Radio Weather Forecast (60 sec)</option>
                                            <option value={sampleEN}>EN: Voicemail Recording (51 sec)</option>
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
                                            <Text fontSize={"sm"} pt={2}>Please wait while we transcribe your audio</Text>
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
