"use client";
import { useEffect, useRef, useState } from "react";
import { useMemoizedFn, usePrevious } from "ahooks";
import { PaperPlaneRight } from "@phosphor-icons/react";
import clsx from "clsx";
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskMode,
  TaskType,
  VoiceEmotion,
} from "@heygen/streaming-avatar";
import {
  Button,
  Card,
  CardContent,
  CardActions,
  Divider,
  TextField,
  Select,
  MenuItem,
  CircularProgress,
  Chip,
  Tooltip,
  FormControl,
  InputLabel,
} from "@mui/material";

// Constants remain the same
export const AVATARS = [
  {
    avatar_id: "Eric_public_pro2_20230608",
    name: "Edward Professor",
  },
  {
    avatar_id: "Tyler-incasualsuit-20220721",
    name: "Tyler Professor",
  },
  {
    avatar_id: "Anna_public_3_20240108",
    name: "Anna Professor",
  },
  {
    avatar_id: "Susan_public_2_20240328",
    name: "Susan Professor",
  },
];

export const STT_LANGUAGE_LIST = [
  { label: 'Bulgarian', value: 'bg', key: 'bg' },
  { label: 'Chinese', value: 'zh', key: 'zh' },
  { label: 'English', value: 'en', key: 'en' },

  // ... rest of the language list remains the same
];

// Text Input Component using Material-UI
function InteractiveAvatarTextInput({
  label,
  placeholder,
  input,
  onSubmit,
  setInput,
  disabled = false,
  loading = false,
}) {
  const handleSubmit = () => {
    if (input.trim() === "") return;
    onSubmit();
    setInput("");
  };

  return (
    <TextField
      fullWidth
      label={label}
      placeholder={placeholder}
      value={input}
      disabled={disabled}
      onChange={(e) => setInput(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") handleSubmit();
      }}
      InputProps={{
        endAdornment: (
          <Tooltip title="Send message">
            <div>
              {loading ? (
                <CircularProgress size={24} />
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={disabled}
                  sx={{ minWidth: 'auto', padding: 1 }}
                >
                  <PaperPlaneRight size={24} />
                </Button>
              )}
            </div>
          </Tooltip>
        ),
      }}
    />
  );
}

// Main Component
export default function InteractiveAvatar() {
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isLoadingRepeat, setIsLoadingRepeat] = useState(false);
  const [stream, setStream] = useState(null);
  const [debug, setDebug] = useState("");
  const [knowledgeId] = useState("f784b05c0195480486805d96cdfec2e9");
  const [avatarId, setAvatarId] = useState("");
  const [language, setLanguage] = useState('en');
  const [text, setText] = useState("");
  const mediaStream = useRef(null);
  const avatar = useRef(null);
  const [chatMode, setChatMode] = useState("voice_mode");
  const [isUserTalking, setIsUserTalking] = useState(false);

  // Handlers remain the same
  async function fetchAccessToken() {
    try {
      const response = await fetch("/api/get-access-token", {
        method: "POST",
      });
      const token = await response.text();
      return token;
    } catch (error) {
      console.error("Error fetching access token:", error);
      return "";
    }
  }

  async function startSession() {
    setIsLoadingSession(true);
    const newToken = await fetchAccessToken();

    avatar.current = new StreamingAvatar({
      token: newToken,
    });

    // Event listeners setup remains the same
    avatar.current.on(StreamingEvents.AVATAR_START_TALKING, (e) => {
      console.log("Avatar started talking", e);
    });
    avatar.current.on(StreamingEvents.AVATAR_STOP_TALKING, (e) => {
      console.log("Avatar stopped talking", e);
    });
    avatar.current.on(StreamingEvents.STREAM_DISCONNECTED, () => {
      console.log("Stream disconnected");
      endSession();
    });
    avatar.current.on(StreamingEvents.STREAM_READY, (event) => {
      console.log("Stream ready:", event.detail);
      setStream(event.detail);
    });
    avatar.current.on(StreamingEvents.USER_START, (event) => {
      console.log("User started talking:", event);
      setIsUserTalking(true);
    });
    avatar.current.on(StreamingEvents.USER_STOP, (event) => {
      console.log("User stopped talking:", event);
      setIsUserTalking(false);
    });

    try {
      const res = await avatar.current.createStartAvatar({
        quality: AvatarQuality.Low,
        avatarName: avatarId,
        knowledgeId: knowledgeId,
        voice: {
          rate: 1.5,
          emotion: VoiceEmotion.EXCITED,
        },
        language: language,
        disableIdleTimeout: true,
      });

      await avatar.current?.startVoiceChat({
        useSilencePrompt: false
      });
      setChatMode("voice_mode");
    } catch (error) {
      console.error("Error starting avatar session:", error);
    } finally {
      setIsLoadingSession(false);
    }
  }

  // Other handlers remain the same
  async function handleSpeak() {
    setIsLoadingRepeat(true);
    if (!avatar.current) {
      setDebug("Avatar API not initialized");
      return;
    }
    await avatar.current.speak({ 
      text: text, 
      taskType: TaskType.REPEAT, 
      taskMode: TaskMode.SYNC 
    }).catch((e) => {
      setDebug(e.message);
    });
    setIsLoadingRepeat(false);
  }

  async function handleInterrupt() {
    if (!avatar.current) {
      setDebug("Avatar API not initialized");
      return;
    }
    await avatar.current.interrupt().catch((e) => {
      setDebug(e.message);
    });
  }

  async function endSession() {
    await avatar.current?.stopAvatar();
    setStream(null);
  }

  // Effects remain the same
  useEffect(() => {
    if (stream && mediaStream.current) {
      mediaStream.current.srcObject = stream;
      mediaStream.current.onloadedmetadata = () => {
        mediaStream.current.play();
        setDebug("Playing");
      };
    }
  }, [mediaStream, stream]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      endSession();
    };
  }, []);

  return (
    <div style={{
      width: '100%',
      backgroundImage: "url('./back.png')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      padding: '20px'
    }}>
      <Card sx={{ maxWidth: '100%' }}>
        <CardContent sx={{ height: 500, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          {stream ? (
            <div style={{ position: 'relative', height: 500, width: 900 }}>
              <video
                ref={mediaStream}
                autoPlay
                playsInline
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              >
                <track kind="captions" />
              </video>
              <div style={{ position: 'absolute', bottom: 12, right: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleInterrupt}
                >
                  Interrupt task
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={endSession}
                >
                  End session
                </Button>
              </div>
            </div>
          ) : !isLoadingSession ? (
            <div style={{ width: 500, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <FormControl fullWidth>
                <InputLabel>Select Teacher</InputLabel>
                <Select
                  value={avatarId}
                  label="Select Teacher"
                  onChange={(e) => setAvatarId(e.target.value)}
                >
                  {AVATARS.map((avatar) => (
                    <MenuItem key={avatar.avatar_id} value={avatar.avatar_id}>
                      {avatar.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Select Language</InputLabel>
                <Select
                  value={language}
                  label="Select Language"
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  {STT_LANGUAGE_LIST.map((lang) => (
                    <MenuItem key={lang.key} value={lang.value}>
                      {lang.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={startSession}
              >
                Start session
              </Button>
            </div>
          ) : (
            <CircularProgress />
          )}
        </CardContent>
        <Divider />
        <CardActions sx={{ padding: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {chatMode === "text_mode" ? (
            <div style={{ width: '100%', position: 'relative' }}>
              <InteractiveAvatarTextInput
                disabled={!stream}
                input={text}
                label="Chat"
                loading={isLoadingRepeat}
                placeholder="Type something for the avatar to respond"
                setInput={setText}
                onSubmit={handleSpeak}
              />
              {text && (
                <Chip
                  label="Listening"
                  sx={{ position: 'absolute', right: 64, top: 12 }}
                />
              )}
            </div>
          ) : (
            <div style={{ width: '100%', textAlign: 'center' }}>
              <Button
                variant="contained"
                color="primary"
                disabled={!isUserTalking}
              >
                {isUserTalking ? "Listening" : "Voice chat"}
              </Button>
            </div>
          )}
        </CardActions>
      </Card>
    </div>
  );
}