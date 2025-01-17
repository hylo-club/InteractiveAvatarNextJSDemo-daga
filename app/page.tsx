"use client";

import { useEffect, useRef, useState } from "react";
import { PaperPlaneRight, Video, Chalkboard, Brain } from "@phosphor-icons/react";
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

interface Message {
  content: string;
  conversation_id: string;
  role: 'user' | 'assistant';
}

const AVATARS: Avatar[] = [
  {
    avatar_id: "da6bd896e2b843e4b4d033a4473eebef",
    name: "Anna Professor",
  }
];

const STT_LANGUAGE_LIST: Language[] = [
  { label: 'Bulgarian', value: 'bg', key: 'bg' },
  { label: 'Chinese', value: 'zh', key: 'zh' },
  { label: 'English', value: 'en', key: 'en' },
];

async function createConversation(): Promise<string> {
  try {
    const response = await fetch('https://hylo.travelr.club/v1/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': 'legalpwd123'
      },
      body: JSON.stringify({
        query: `
          mutation CreateConversation {
  insert_conversation_one(object: {teacher_id: "a411a4db-97f8-47d7-95db-031ff675ab8e"}) {
    id
  }
}
        `
      })
    });

    const data = await response.json();
    return data.data.insert_conversation_one.id;
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
}

async function addMessage(message: Message): Promise<void> {
  try {
    await fetch('https://hylo.travelr.club/v1/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': 'legalpwd123'
      },
      body: JSON.stringify({
        query: `
          mutation AddMessage($content: String!, $conversation_id: uuid!, $role: String!) {
            insert_message_one(object: {
              content: $content,
              conversation_id: $conversation_id,
              role: $role
            }) {
              id
            }
          }
        `,
        variables: {
          content: message.content,
          conversation_id: message.conversation_id,
          role: message.role
        }
      })
    });
  } catch (error) {
    console.error('Error adding message:', error);
    throw error;
  }
}

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
  const [timeLeft, setTimeLeft] = useState<number>(180);
  const [sessionActive, setSessionActive] = useState<boolean>(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [hasAvatarEndedMessage, setHasAvatarEndedMessage] = useState(false);
  const [currentAvatarMessage, setCurrentAvatarMessage] = useState<string>('');
  
  // Effect to handle saving messages when avatar ends speaking
  useEffect(() => {
    const saveMessage = async () => {
      console.log('Checking if message needs to be saved...', hasAvatarEndedMessage, currentAvatarMessage, conversationId);
      if (hasAvatarEndedMessage && currentAvatarMessage && conversationId) {
        console.log('Saving message:', currentAvatarMessage);
        try {
          await addMessage({
            content: currentAvatarMessage,
            conversation_id: conversationId,
            role: 'assistant'
          });
          console.log('Message saved successfully');
          setHasAvatarEndedMessage(false);
          setCurrentAvatarMessage('');

        } catch (error) {
          console.error('Error saving message:', error);
        }
      }
    };

    saveMessage();
  }, [hasAvatarEndedMessage, currentAvatarMessage, conversationId]);

  // Other useEffects...
  useEffect(() => {
    console.log("conversation id updated to:", conversationId);
  }, [conversationId]);

  // Add useEffect to track currentAvatarMessage changes
  useEffect(() => {
    console.log("currentAvatarMessage updated to:", currentAvatarMessage);
  }, [currentAvatarMessage]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const startTimer = () => {
    setSessionActive(true);
    setTimeLeft(180);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          void endSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(false);
  const [isLoadingRepeat, setIsLoadingRepeat] = useState<boolean>(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [debug, setDebug] = useState<string>("");
  const [knowledgeId] = useState<string>("f784b05c0195480486805d96cdfec2e9");
  const [avatarId, setAvatarId] = useState<string>("eacbb14b1c3b4586876c521713bae943");
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
    setCurrentAvatarMessage('');
    try {
      // Create new conversation
      const newConversationId = await createConversation();
      console.log("New conversation created with id:", newConversationId);
      setConversationId(newConversationId);

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
        console.log("Avatar started talking", JSON.stringify(e));
      });

      avatar.current.on(StreamingEvents.AVATAR_TALKING_MESSAGE, (message) => {
        const messageText = message?.detail?.message || '';
        setCurrentAvatarMessage(prev => prev + messageText);
        console.log("Avatar said", messageText);
      });

      avatar.current.on(StreamingEvents.AVATAR_STOP_TALKING, (e) => {
        console.log("Avatar stopped talking", e);
        setHasAvatarEndedMessage(true)
      });
      
      avatar.current.on(StreamingEvents.STREAM_DISCONNECTED, () => {
        console.log("Stream disconnected");
        void endSession();
      });

      avatar.current.on(StreamingEvents.USER_TALKING_MESSAGE, async (message) => {
        console.log('User said:', message?.detail.message);
        const userMessage = message?.detail.message;
        if (newConversationId && userMessage) {
          console.log('Adding user message to conversation:', newConversationId);
          await addMessage({
            content: userMessage,
            conversation_id: newConversationId,
            role: 'user'
          });
        }
      });

      avatar.current.on(StreamingEvents.STREAM_READY, (event) => {
        console.log("Stream ready:", event.detail);
        if (event.detail) {
          setStream(event.detail);
          startTimer();
        }
      });
      
      avatar.current.on(StreamingEvents.USER_START, () => {
        console.log("User started talking");
        setIsUserTalking(true);
      });

      avatar.current.on(StreamingEvents.AVATAR_END_MESSAGE, async (message) => {
        console.log('Avatar end message:', message);
        if (newConversationId && currentAvatarMessage) {
          console.log('Adding avatar message to conversation:', newConversationId);
          await addMessage({
            content: currentAvatarMessage,
            conversation_id: newConversationId,
            role: 'assistant'
          });
        }
      });

      avatar.current.on(StreamingEvents.USER_STOP, () => {
        console.log("User stopped talking");
        setIsUserTalking(false);
      });

      avatar.current.on(StreamingEvents.USER_END_MESSAGE, (message) => {
        console.log('User end message:', message);
      });
      
      await avatar.current.createStartAvatar({
        quality: AvatarQuality.High,
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
    console.log("Speaking:", text);
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
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setSessionActive(false);
    setStream(null);
    setTimeLeft(180);
    setConversationId(null);
    setCurrentAvatarMessage('');
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
      padding: { xs: '8px', sm: '0px' },
    }}>
      <Card sx={{ 
        maxWidth: '100%', 
        margin: '0 auto',
        mt: { xs: 2, sm: 3 }
      }}>
        <CardContent sx={{ 
          minHeight: { xs: '450px', sm: '500px' },
          height: 'auto',
          p: { xs: 2, sm: 3 },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          {stream ? (
            <Box sx={{
              position: 'relative',
              width: '100%',
              height: { xs: '350px', sm: '500px' },
              maxWidth: '900px',
            }}>
              <video
                ref={mediaStream}
                autoPlay
                playsInline
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: '8px',
                }}
              >
                <track kind="captions" />
              </video>
              <Box sx={{
                position: 'absolute',
                bottom: { xs: 4, sm: 12 },
                right: { xs: 4, sm: 12 },
                display: 'flex',
                flexDirection: 'row',
                gap: 1,
              }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => void handleInterrupt()}
                  size="small"
                  sx={{ minWidth: { xs: '60px', sm: 'auto' } }}
                >
                  Interrupt AI
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => void endSession()}
                  size="small"
                >
                  End Call
                </Button>
              </Box>
            </Box>
          ) : !isLoadingSession ? (
            <Box sx={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: { xs: 2, sm: 3 },
              alignItems: 'center',
              px: { xs: 1, sm: 0 }
            }}>
              <Typography variant="h4" 
                component="h1" 
                sx={{ 
                  fontWeight: 600,
                  fontSize: { xs: '1.5rem', sm: '2.125rem' },
                  textAlign: 'center',
                  marginTop: { xs: 2, sm: 0 }
                }}
              >
                Hi, I am Dr. Seema Negi
              </Typography>
              
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 600,
                  fontSize: { xs: '1rem', sm: '1.25rem' },
                  textAlign: 'center',
                  mb: { xs: 1, sm: 2 }
                }}
              >
                Principal, Sanjeevini World School
              </Typography>

              <Box sx={{
                width: '100%',
                maxWidth: { xs: '100%', sm: '700px' },
                px: { xs: 2, sm: 0 }
              }}>
                <img 
                  src="/preview.gif" 
                  alt="Preview" 
                  style={{
                    width: '100%',
                    height: 'auto',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </Box>

             

              <Button
                variant="contained"
                color="primary"
                onClick={() => void startSession()}
                size="medium"
                disabled={!avatarId}
                sx={{
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  py: 1,
                  px: 3,
                  backgroundColor: '#4CAF50',
                  mt: { xs: 2, sm: 3 },
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                MEET ME &nbsp; <Video size={18} />
              </Button>
              <Typography 
                variant="body1" 
                sx={{ 
                  color: 'text.secondary',
                  textAlign: 'center',
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  maxWidth: { xs: '300px', sm: '500px' },
                  mx: 'auto',
                  mt: { xs: 2, sm: 3 }
                }}
              >
                I can help you with Admission queries, Learning Support, Doubt solving, Counselling
              </Typography>
            </Box>
          ) : (
            <CircularProgress />
          )}
        </CardContent>

        <Divider />
        
        <CardActions sx={{
          p: { xs: 2, sm: 3 },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          {chatMode === "text_mode" ? (
            <Box sx={{
              width: '100%',
              position: 'relative',
              px: { xs: 1, sm: 2 }
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
            </Box>
          ) : (
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'text.secondary',
                textAlign: 'center',
                fontSize: { xs: '0.75rem', sm: '0.875rem' }
              }}
            >
              This AI Can make some mistakes. Check for important info
            </Typography>
          )}
        </CardActions>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: { xs: 'center', sm: 'flex-end' },
          width: { xs: '100%', sm: 'auto' },
          mb: { xs: 2, sm: 0 },
          px: 2
        }}>
          Powered by <img 
            src="/logo.png" 
            alt="Logo" 
            style={{ 
              height: '32px',
              maxWidth: '100%',
              marginLeft: '8px'
            }} 
          />
        </Box>
      </Card>
    </Box>
  );
}