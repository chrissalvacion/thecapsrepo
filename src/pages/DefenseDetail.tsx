import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Defense } from '../types';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ChevronLeft, Mic, MicOff, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface RecordingSession {
  id: string;
  startedAt: Date;
  transcript: string;
  audioUrl: string | null;
}

interface RecommendationItem {
  id: string;
  panelist: string;
  content: string;
  createdAt: Date;
}

// Extend Window for browser SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function DefenseDetail() {
  const { teamId, defenseId } = useParams();
  const navigate = useNavigate();
  const sessionsStorageKey = `defense_sessions_${defenseId}`;
  const recommendationsStorageKey = `defense_recommendations_${defenseId}`;
  const [defense, setDefense] = useState<Defense | null>(null);
  const [loading, setLoading] = useState(true);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [manualSessionDraft, setManualSessionDraft] = useState('');
  const [manualTranscripts, setManualTranscripts] = useState<Record<string, string>>({});
  const [editingRecommendations, setEditingRecommendations] = useState<Record<string, string>>({});
  const [selectedPanelist, setSelectedPanelist] = useState('');
  const [recommendationDraft, setRecommendationDraft] = useState('');
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>(() => {
    try {
      const stored = localStorage.getItem(recommendationsStorageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [sessions, setSessions] = useState<RecordingSession[]>(() => {
    try {
      const stored = localStorage.getItem(sessionsStorageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const sessionStartRef = useRef<Date>(new Date());
  const skipSaveOnStopRef = useRef(false);

  useEffect(() => {
    if (!defenseId) return;
    api.defenses.list(teamId)
      .then((list: Defense[]) => {
        const found = list.find(d => d.id === defenseId);
        setDefense(found || null);
        if (found?.panelists?.length) {
          setSelectedPanelist(found.panelists[0]);
        }
      })
      .catch(() => toast.error('Failed to load defense'))
      .finally(() => setLoading(false));
  }, [defenseId, teamId]);

  // Persist sessions to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(sessionsStorageKey, JSON.stringify(sessions));
  }, [sessions, sessionsStorageKey]);

  useEffect(() => {
    localStorage.setItem(recommendationsStorageKey, JSON.stringify(recommendations));
  }, [recommendations, recommendationsStorageKey]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // MediaRecorder for audio blob
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      sessionStartRef.current = new Date();

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        if (skipSaveOnStopRef.current) {
          skipSaveOnStopRef.current = false;
          setLiveTranscript('');
          return;
        }
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(blob);
        const finalTranscript = liveTranscript;
        setSessions((prev: RecordingSession[]) => [
          {
            id: crypto.randomUUID(),
            startedAt: sessionStartRef.current,
            transcript: finalTranscript || '(No transcription captured)',
            audioUrl,
          },
          ...prev,
        ]);
        setLiveTranscript('');
      };

      mediaRecorder.start();

      // Speech recognition for transcription
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        let finalText = '';
        recognition.onresult = (event: any) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalText += transcript + ' ';
            } else {
              interim += transcript;
            }
          }
          setLiveTranscript(finalText + interim);
        };

        recognition.onerror = (e: any) => {
          if (e.error !== 'no-speech') console.warn('Speech recognition error:', e.error);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } else {
        toast.warning('Speech recognition is not supported in this browser. Audio will still be recorded.');
      }

      setIsRecording(true);
    } catch (err) {
      toast.error('Microphone access denied or unavailable.');
    }
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const deleteSession = (id: string) => {
    setSessions((prev: RecordingSession[]) => prev.filter((s: RecordingSession) => s.id !== id));
  };

  const saveManualTranscript = (sessionId: string) => {
    const manualText = (manualTranscripts[sessionId] || '').trim();
    if (!manualText) {
      toast.error('Please enter a transcript before saving.');
      return;
    }

    setSessions((prev: RecordingSession[]) => prev.map((session: RecordingSession) => (
      session.id === sessionId ? { ...session, transcript: manualText } : session
    )));
    setManualTranscripts((prev: Record<string, string>) => {
      const next = { ...prev };
      delete next[sessionId];
      return next;
    });
    toast.success('Transcript saved.');
  };

  const addManualSession = () => {
    const manualText = manualSessionDraft.trim();
    if (!manualText) {
      toast.error('Please type a transcript before saving.');
      return;
    }

    setSessions((prev: RecordingSession[]) => [
      {
        id: crypto.randomUUID(),
        startedAt: new Date(),
        transcript: manualText,
        audioUrl: null,
      },
      ...prev,
    ]);
    setManualSessionDraft('');
    toast.success('Manual transcript saved as a session.');
  };

  const handleAddRecommendation = () => {
    const text = recommendationDraft.trim();
    if (!text) {
      toast.error('Please add a recommendation first.');
      return;
    }
    if (!selectedPanelist) {
      toast.error('Please select a panelist.');
      return;
    }

    setRecommendations((prev: RecommendationItem[]) => [
      {
        id: crypto.randomUUID(),
        panelist: selectedPanelist,
        content: text,
        createdAt: new Date(),
      },
      ...prev,
    ]);
    setRecommendationDraft('');
    toast.success('Recommendation added.');
  };

  const insertPanelistMention = (name: string) => {
    const mention = `@${name} `;
    setRecommendationDraft((prev: string) => `${prev}${mention}`);
  };

  const deleteRecommendation = (id: string) => {
    setRecommendations((prev: RecommendationItem[]) => prev.filter((item: RecommendationItem) => item.id !== id));
    setEditingRecommendations((prev: Record<string, string>) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    toast.success('Recommendation removed.');
  };

  const startEditRecommendation = (item: RecommendationItem) => {
    setEditingRecommendations((prev: Record<string, string>) => ({ ...prev, [item.id]: item.content }));
  };

  const cancelEditRecommendation = (id: string) => {
    setEditingRecommendations((prev: Record<string, string>) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const saveRecommendationEdit = (id: string) => {
    const editedText = (editingRecommendations[id] || '').trim();
    if (!editedText) {
      toast.error('Recommendation cannot be empty.');
      return;
    }

    setRecommendations((prev: RecommendationItem[]) =>
      prev.map((item: RecommendationItem) => (item.id === id ? { ...item, content: editedText } : item))
    );
    cancelEditRecommendation(id);
    toast.success('Recommendation updated.');
  };

  const renderMentionHighlight = (text: string) => {
    if (!defense?.panelists?.length) {
      return text;
    }

    const escapedNames = defense.panelists
      .slice()
      .sort((a, b) => b.length - a.length)
      .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

    const mentionRegex = new RegExp(`(@(?:${escapedNames.join('|')}))`, 'gi');
    const parts = text.split(mentionRegex);

    return parts.map((part, index) => {
      if (part.match(mentionRegex)) {
        return (
          <span key={index} className="bg-primary/15 text-primary font-semibold rounded px-1">
            {part}
          </span>
        );
      }
      return <React.Fragment key={index}>{part}</React.Fragment>;
    });
  };

  const clearAllSessions = () => {
    const shouldClear = window.confirm('Delete all associated recordings and manual sessions?');
    if (!shouldClear) return;

    if (isRecording) {
      skipSaveOnStopRef.current = true;
      stopRecording();
    }

    setSessions([]);
    setManualSessionDraft('');
    setManualTranscripts({});
    localStorage.removeItem(sessionsStorageKey);
    toast.success('All associated sessions were deleted.');
  };

  const deleteDefenseRecord = async () => {
    const shouldDelete = window.confirm('Delete this defense record and all associated sessions? This cannot be undone.');
    if (!shouldDelete || !defenseId) return;

    try {
      if (isRecording) {
        skipSaveOnStopRef.current = true;
        stopRecording();
      }

      await api.defenses.delete(defenseId);
      setSessions([]);
      setRecommendations([]);
      setManualSessionDraft('');
      setManualTranscripts({});
      localStorage.removeItem(sessionsStorageKey);
      localStorage.removeItem(recommendationsStorageKey);
      toast.success('Defense record deleted.');
      navigate('/defenses');
    } catch {
      toast.error('Failed to delete defense record.');
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!defense) return <div className="p-8 text-center">Defense not found.</div>;

  return (
    <div className="space-y-6 pb-20">
      <Link
        to={`/teams/${teamId}`}
        className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-2"
      >
        <ChevronLeft className="h-4 w-4 mr-1" /> Back to Team
      </Link>

      {/* Defense Info */}
      <div className="border-b pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">{defense.defense_type}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {format(new Date(defense.defense_date), 'PPP')} at {defense.defense_time}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="text-destructive border-destructive/40 hover:bg-destructive/10"
            onClick={clearAllSessions}
          >
            <Trash2 className="h-4 w-4 mr-2" /> Clear Associated Sessions
          </Button>
          <Button type="button" variant="destructive" onClick={deleteDefenseRecord}>
            <Trash2 className="h-4 w-4 mr-2" /> Delete Defense Record
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Panelists</p>
            <ul className="space-y-0.5">
              {defense.panelists.map((p, i) => (
                <li key={i} className="text-sm font-medium">{p}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Status</p>
            <Badge variant={defense.status === 'Completed' ? 'default' : 'outline'}>{defense.status}</Badge>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Recommendations</p>
            <p className="text-sm">{defense.recommendations || <span className="italic text-muted-foreground">Pending</span>}</p>
            {defense.suggestions && (
              <p className="text-xs text-muted-foreground italic mt-1">"{defense.suggestions}"</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Voice Recording */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mic className="h-5 w-5" /> Session Recording
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {isRecording ? (
              <Button variant="destructive" onClick={stopRecording} className="gap-2">
                <MicOff className="h-4 w-4" /> Stop Recording
              </Button>
            ) : (
              <Button onClick={startRecording} className="gap-2">
                <Mic className="h-4 w-4" /> Start Recording
              </Button>
            )}
            {isRecording && (
              <span className="flex items-center gap-2 text-sm text-destructive font-medium">
                <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                Recording in progress...
              </span>
            )}
          </div>

          {isRecording && liveTranscript && (
            <div className="bg-muted/40 rounded-md p-3 border">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Live Transcript</p>
              <p className="text-sm whitespace-pre-wrap">{liveTranscript}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="transcriptions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transcriptions">Manual Transcriptions</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="transcriptions" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Manual Transcription</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="Type transcript manually (use this even before any recording is done)..."
                value={manualSessionDraft}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setManualSessionDraft(e.target.value)}
              />
              <div className="flex justify-end">
                <Button type="button" onClick={addManualSession}>Save Manual Session</Button>
              </div>
            </CardContent>
          </Card>

          {sessions.length > 0 ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Recorded Sessions ({sessions.length})</h2>
              {sessions.map((session) => (
                <Card key={session.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-semibold">
                          {format(new Date(session.startedAt), 'PPP p')}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => deleteSession(session.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {session.audioUrl && (
                      <audio controls src={session.audioUrl} className="w-full h-9" />
                    )}

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Transcript</p>
                      <p className="text-sm whitespace-pre-wrap bg-muted/30 rounded-md p-3 border">
                        {session.transcript}
                      </p>
                    </div>

                    {(!session.transcript || session.transcript === '(No transcription captured)') && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Manual Transcript Input</p>
                        <Textarea
                          placeholder="Type the transcript manually for this session..."
                          value={manualTranscripts[session.id] || ''}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setManualTranscripts((prev: Record<string, string>) => ({ ...prev, [session.id]: e.target.value }))}
                        />
                        <div className="flex justify-end">
                          <Button type="button" onClick={() => saveManualTranscript(session.id)}>
                            Save Transcript
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            !isRecording && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No sessions yet. You can start recording or add a manual transcript above.
              </p>
            )
          )}
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add Recommendation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Panelist</p>
                <Select value={selectedPanelist} onValueChange={setSelectedPanelist}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select panelist" />
                  </SelectTrigger>
                  <SelectContent>
                    {defense.panelists.map((name) => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div> */}

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mention Panelists</p>
                <div className="flex flex-wrap gap-2">
                  {defense.panelists.map((name) => (
                    <Button key={name} type="button" variant="outline" size="sm" onClick={() => insertPanelistMention(name)}>
                      @{name}
                    </Button>
                  ))}
                </div>
              </div>

              <Textarea
                placeholder="Write recommendation details. Mention panelists like @Name to highlight them."
                value={recommendationDraft}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRecommendationDraft(e.target.value)}
              />
              <div className="flex justify-end">
                <Button type="button" onClick={handleAddRecommendation}>Add Recommendation</Button>
              </div>
            </CardContent>
          </Card>

          {recommendations.length > 0 ? (
            <div className="space-y-3">
              {recommendations.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">{item.panelist}</Badge>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{format(new Date(item.createdAt), 'PPP p')}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (editingRecommendations[item.id] !== undefined) {
                              saveRecommendationEdit(item.id);
                            } else {
                              startEditRecommendation(item);
                            }
                          }}
                        >
                          {editingRecommendations[item.id] !== undefined ? 'Save' : 'Edit'}
                        </Button>
                        {editingRecommendations[item.id] !== undefined ? (
                          <Button type="button" variant="ghost" size="sm" onClick={() => cancelEditRecommendation(item.id)}>
                            Cancel
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => deleteRecommendation(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {editingRecommendations[item.id] !== undefined ? (
                      <Textarea
                        value={editingRecommendations[item.id]}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setEditingRecommendations((prev: Record<string, string>) => ({ ...prev, [item.id]: e.target.value }))
                        }
                      />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{renderMentionHighlight(item.content)}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No recommendations yet.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
