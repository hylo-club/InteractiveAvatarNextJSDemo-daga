"use client";

import { useEffect, useRef, useState } from "react";
import { PaperPlaneRight } from "@phosphor-icons/react";
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskMode,
  TaskType,
  VoiceEmotion,
} from "@heygen/streaming-avatar";
import {
  AppBar,
  Button,
  Card,
  Toolbar,
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
  useTheme,
  useMediaQuery,
  Box,
  Typography
} from "@mui/material";

interface Avatar {
  avatar_id: string;
  name: string;
}

interface Language {
  label: string;
  value: string;
  key: string;
}

const AVATARS: Avatar[] = [
  
  {
    avatar_id: "Tyler-incasualsuit-20220721",
    name: "Tyler Professor",
  },
  {
    avatar_id: "Anna_public_3_20240108",
    name: "Anna Professor",
  }
];

const STT_LANGUAGE_LIST: Language[] = [
  { label: 'Bulgarian', value: 'bg', key: 'bg' },
  { label: 'Chinese', value: 'zh', key: 'zh' },
  { label: 'English', value: 'en', key: 'en' },
];

interface InteractiveAvatarTextInputProps {
  label: string;
  placeholder: string;
  input: string;
  onSubmit: () => void;
  setInput: (value: string) => void;
  disabled?: boolean;
  loading?: boolean;
}

function InteractiveAvatarTextInput({
  label,
  placeholder,
  input,
  onSubmit,
  setInput,
  disabled = false,
  loading = false,
}: InteractiveAvatarTextInputProps) {
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

export default function InteractiveAvatar() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(false);
  const [isLoadingRepeat, setIsLoadingRepeat] = useState<boolean>(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [debug, setDebug] = useState<string>("");
  const [knowledgeId] = useState<string>("f784b05c0195480486805d96cdfec2e9");
  const [avatarId, setAvatarId] = useState<string>("");
  const [language, setLanguage] = useState<string>('en');
  const [text, setText] = useState<string>("");
  const [chatMode, setChatMode] = useState<"voice_mode" | "text_mode">("voice_mode");
  const [isUserTalking, setIsUserTalking] = useState<boolean>(false);

  const mediaStream = useRef<HTMLVideoElement | null>(null);
  const avatar = useRef<StreamingAvatar | null>(null);

  const fetchAccessToken = async (): Promise<string> => {
    try {
      const response = await fetch("/api/get-access-token", {
        method: "POST",
      });
      return await response.text();
    } catch (error) {
      console.error("Error fetching access token:", error);
      return "";
    }
  };

  const startSession = async (): Promise<void> => {
    setIsLoadingSession(true);
    try {
      const newToken = await fetchAccessToken();
      if (!newToken) {
        throw new Error("Failed to get access token");
      }

      avatar.current = new StreamingAvatar({
        token: newToken,
      });

      if (!avatar.current) {
        throw new Error("Failed to create avatar instance");
      }

      // Set up event listeners
      avatar.current.on(StreamingEvents.AVATAR_START_TALKING, (e) => {
        console.log("Avatar started talking", e);
      });
      
      avatar.current.on(StreamingEvents.AVATAR_STOP_TALKING, (e) => {
        console.log("Avatar stopped talking", e);
      });
      
      avatar.current.on(StreamingEvents.STREAM_DISCONNECTED, () => {
        console.log("Stream disconnected");
        void endSession();
      });
      
      avatar.current.on(StreamingEvents.STREAM_READY, (event) => {
        console.log("Stream ready:", event.detail);
        if (event.detail) {
          setStream(event.detail);
        }
      });
      
      avatar.current.on(StreamingEvents.USER_START, () => {
        console.log("User started talking");
        setIsUserTalking(true);
      });
      
      avatar.current.on(StreamingEvents.USER_STOP, () => {
        console.log("User stopped talking");
        setIsUserTalking(false);
      });

      await avatar.current.createStartAvatar({
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

      await avatar.current.startVoiceChat({
        useSilencePrompt: false
      });
      
      setChatMode("voice_mode");
    } catch (error) {
      console.error("Error starting avatar session:", error);
      setDebug("Failed to start session");
    } finally {
      setIsLoadingSession(false);
    }
  };

  const handleSpeak = async (): Promise<void> => {
    if (!avatar.current || !text.trim()) return;
    
    setIsLoadingRepeat(true);
    try {
      await avatar.current.speak({
        text: text,
        taskType: TaskType.REPEAT,
        taskMode: TaskMode.SYNC
      });
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error in speak:", error);
        setDebug(error.message);
      }
    } finally {
      setIsLoadingRepeat(false);
    }
  };

  const handleInterrupt = async (): Promise<void> => {
    if (!avatar.current) return;
    
    try {
      await avatar.current.interrupt();
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error in interrupt:", error);
        setDebug(error.message);
      }
    }
  };

  const endSession = async (): Promise<void> => {
    if (avatar.current) {
      await avatar.current.stopAvatar();
    }
    setStream(null);
  };

  useEffect(() => {
    if (stream && mediaStream.current) {
      mediaStream.current.srcObject = stream;
      mediaStream.current.onloadedmetadata = () => {
        void mediaStream.current?.play().catch(error => {
          console.error("Error playing video:", error);
        });
      };
    }
  }, [stream]);

  useEffect(() => {
    return () => {
      void endSession();
    };
  }, []);

  return (
    <Box sx={{
      width: '100%',
      minHeight: '100vh',
      padding: { xs: '10px', sm: '20px' },
    }}>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <img 
              src="/logo.png" 
              alt="Logo" 
              style={{ height: '40px', marginRight: '16px' }} 
            />
          </Box>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: { xs: 'center', sm: 'flex-end' }
          }}>
            <Typography variant="h6" component="h1" sx={{ 
              color: 'primary.main',
              fontWeight: 600,
              textAlign: { xs: 'center', sm: 'right' }
            }}>
              Hi, I am Jenny
            </Typography>
            <Typography variant="body1" sx={{ 
              color: 'text.secondary',
              textAlign: { xs: 'center', sm: 'right' }
            }}>
              I will be glad to assist you for Admission, Academic, Special, Psychological and Emotional needs
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>

      <Card sx={{ maxWidth: '100%', margin: '0 auto' }}>
        <CardContent sx={{ 
          height: { xs: 400, sm: 500 },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          {stream ? (
            <Box sx={{
              position: 'relative',
              height: { xs: '100%', sm: 500 },
              width: '100%',
              maxWidth: { xs: '100%', sm: 900 },
            }}>
              <video
                ref={mediaStream}
                autoPlay
                playsInline
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: isMobile ? "cover" : "contain",
                }}
              >
                <track kind="captions" />
              </video>
              <Box sx={{
                position: 'absolute',
                bottom: { xs: 8, sm: 12 },
                right: { xs: 8, sm: 12 },
                display: 'flex',
                flexDirection: { xs: 'row', sm: 'column' },
                gap: 1,
              }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => void handleInterrupt()}
                  size={isMobile ? "small" : "medium"}
                >
                  {isMobile ? "Stop" : "Interrupt task"}
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => void endSession()}
                  size={isMobile ? "small" : "medium"}
                >
                  End
                </Button>
              </Box>
            </Box>
          ) : !isLoadingSession ? (
            <Box sx={{
              width: { xs: '100%', sm: 500 },
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              padding: { xs: 2, sm: 0 },
            }}>
              <FormControl fullWidth>
                <InputLabel>Select Teacher</InputLabel>
                <Select
                  value={avatarId}
                  label="Select Teacher"
                  onChange={(e) => setAvatarId(e.target.value)}
                  size={isMobile ? "small" : "medium"}
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
                  size={isMobile ? "small" : "medium"}
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
                onClick={() => void startSession()}
                size={isMobile ? "small" : "medium"}
                disabled={!avatarId}
              >
                Start session
              </Button>
            </Box>
          ) : (
            <CircularProgress />
          )}
        </CardContent>
        <Divider />
        <CardActions sx={{
          padding: { xs: 1, sm: 2 },
          display: 'flex',
          flexDirection: 'column',
          gap: { xs: 1, sm: 2 },
        }}>
          {chatMode === "text_mode" ? (
            <Box sx={{
              width: '100%',
              position: 'relative',
              padding: { xs: 1, sm: 0 },
            }}>
              <InteractiveAvatarTextInput
                disabled={!stream}
                input={text}
                label="Chat"
                loading={isLoadingRepeat}
                placeholder="Type something for the avatar to respond"
                setInput={setText}
                onSubmit={() => void handleSpeak()}
              />
              {text && (
                <Chip
                  label="Listening"
                  sx={{
                    position: 'absolute',
                    right: { xs: 8, sm: 64 },
                    top: { xs: 8, sm: 12 },
                  }}
                />
              )}
            </Box>
          ) : (
            <Box sx={{
              width: '100%',
              textAlign: 'center',
              padding: { xs: 1, sm: 0 },
            }}>
              <Button
                variant="contained"
                color="primary"
                disabled={!isUserTalking}
                size={isMobile ? "small" : "medium"}
              >
                {isUserTalking ? "Listening" : "Voice chat"}
              </Button>
            </Box>
          )}
        </CardActions>
      </Card>
    </Box>
  );
}