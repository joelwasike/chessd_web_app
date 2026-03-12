import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { useAuth } from '../contexts/AuthContext';
import { WebSocketService } from '../services/websocket';
import api from '../services/api';
import AnimatedBackground from '../components/AnimatedBackground';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds) {
  if (seconds == null || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function resultLabel(result, method, mode, myColor) {
  if (mode === 'local') {
    if (result === '1-0') return 'White Wins';
    if (result === '0-1') return 'Black Wins';
    return 'Draw';
  }
  if (result === 'draw' || result === '1/2-1/2') return 'Draw';
  const whiteWins = result === '1-0' || result === 'white';
  const iWin =
    (whiteWins && myColor === 'w') || (!whiteWins && myColor === 'b');
  return iWin ? 'You Win!' : 'You Lose';
}

// Piece symbols for display
const PIECE_SYMBOLS = {
  p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚',
  P: '♙', N: '♘', B: '♗', R: '♖', Q: '♕', K: '♔',
};

// Starting piece counts per side
const STARTING_PIECES = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };

// Piece values for material advantage calculation
const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

// Display order (most valuable first)
const PIECE_ORDER = ['q', 'r', 'b', 'n', 'p'];

function getCapturedPieces(fen) {
  // Count pieces on board from FEN
  const board = fen.split(' ')[0];
  const white = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
  const black = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };

  for (const ch of board) {
    if (ch >= 'A' && ch <= 'Z') white[ch.toLowerCase()] = (white[ch.toLowerCase()] || 0) + 1;
    else if (ch >= 'a' && ch <= 'z') black[ch] = (black[ch] || 0) + 1;
  }

  // Captured = starting minus remaining on board
  // White captured these black pieces, black captured these white pieces
  const whiteCaptured = []; // black pieces white took
  const blackCaptured = []; // white pieces black took
  let whiteMaterial = 0, blackMaterial = 0;

  for (const p of PIECE_ORDER) {
    const blackMissing = STARTING_PIECES[p] - (black[p] || 0);
    const whiteMissing = STARTING_PIECES[p] - (white[p] || 0);
    for (let i = 0; i < blackMissing; i++) whiteCaptured.push(p);
    for (let i = 0; i < whiteMissing; i++) blackCaptured.push(p);
    whiteMaterial += (white[p] || 0) * PIECE_VALUES[p];
    blackMaterial += (black[p] || 0) * PIECE_VALUES[p];
  }

  const advantage = whiteMaterial - blackMaterial;
  return { whiteCaptured, blackCaptured, advantage };
}

function CapturedPieces({ pieces, color, advantage }) {
  // pieces: array of piece types this player captured
  // color: 'w' or 'b' — the capturing player
  // advantage: positive means white leads
  const adv = color === 'w' ? advantage : -advantage;
  if (pieces.length === 0 && adv <= 0) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', minHeight: 22 }}>
      {pieces.map((p, i) => (
        <span key={i} style={{
          fontSize: 16,
          lineHeight: 1,
          opacity: 0.85,
          color: color === 'w' ? '#555' : '#ddd',
          filter: color === 'w' ? 'none' : 'drop-shadow(0 0 1px rgba(0,0,0,0.5))',
        }}>
          {color === 'w' ? PIECE_SYMBOLS[p] : PIECE_SYMBOLS[p.toUpperCase()]}
        </span>
      ))}
      {adv > 0 && (
        <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700, marginLeft: 4 }}>
          +{adv}
        </span>
      )}
    </div>
  );
}

function methodLabel(method) {
  if (!method) return '';
  const map = {
    checkmate: 'by checkmate',
    resignation: 'by resignation',
    timeout: 'by timeout',
    stalemate: 'by stalemate',
    insufficient: 'by insufficient material',
    repetition: 'by repetition',
    '50move': 'by 50-move rule',
    agreement: 'by agreement',
  };
  return map[method] || `by ${method}`;
}

// ── Styles ───────────────────────────────────────────────────────────────────

const s = {
  wrapper: {
    position: 'relative',
    zIndex: 1,
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
  },
  container: {
    maxWidth: 600,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  playerBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'var(--glass-bg)',
    backdropFilter: 'blur(var(--glass-blur))',
    WebkitBackdropFilter: 'blur(var(--glass-blur))',
    border: '1.2px solid var(--glass-border)',
    borderRadius: 14,
    padding: '10px 16px',
  },
  playerName: {
    fontWeight: 600,
    fontSize: 15,
    color: 'var(--text-primary)',
  },
  clock: {
    fontFamily: "'Lato', sans-serif",
    fontWeight: 700,
    fontSize: 18,
    padding: '4px 12px',
    borderRadius: 8,
    letterSpacing: 1,
    minWidth: 72,
    textAlign: 'center',
  },
  clockActive: {
    background: 'rgba(212,160,60,0.2)',
    color: 'var(--accent)',
    boxShadow: '0 0 12px rgba(212,160,60,0.3)',
  },
  clockInactive: {
    background: 'rgba(255,255,255,0.05)',
    color: 'var(--text-secondary)',
  },
  controls: {
    display: 'flex',
    gap: 8,
    background: 'var(--glass-bg)',
    backdropFilter: 'blur(var(--glass-blur))',
    WebkitBackdropFilter: 'blur(var(--glass-blur))',
    border: '1.2px solid var(--glass-border)',
    borderRadius: 14,
    padding: '10px 12px',
  },
  btnBase: {
    flex: 1,
    padding: '10px 0',
    borderRadius: 10,
    fontFamily: "'Lato', sans-serif",
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    border: 'none',
    transition: 'all 0.2s',
  },
  btnResign: {
    background: 'var(--danger)',
    color: '#fff',
  },
  btnDraw: {
    background: 'transparent',
    color: 'var(--accent)',
    border: '1.5px solid var(--accent)',
  },
  btnFlip: {
    background: 'rgba(255,255,255,0.08)',
    color: 'var(--text-primary)',
    border: '1.5px solid var(--glass-border)',
  },
  moveList: {
    background: 'var(--glass-bg)',
    backdropFilter: 'blur(var(--glass-blur))',
    WebkitBackdropFilter: 'blur(var(--glass-blur))',
    border: '1.2px solid var(--glass-border)',
    borderRadius: 14,
    padding: '10px 14px',
    minHeight: 48,
    maxHeight: 120,
    overflowY: 'auto',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '2px 0',
    fontSize: 13,
    color: 'var(--text-secondary)',
    lineHeight: 1.8,
    alignContent: 'flex-start',
  },
  moveNumber: {
    color: 'var(--text-secondary)',
    opacity: 0.6,
    marginRight: 3,
    minWidth: 28,
    textAlign: 'right',
  },
  moveText: {
    marginRight: 8,
    color: 'var(--text-primary)',
    fontWeight: 500,
  },
  // Overlay
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 100,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  overlayCard: {
    background: 'var(--glass-bg)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1.2px solid var(--glass-border)',
    borderRadius: 20,
    padding: '40px 32px 32px',
    textAlign: 'center',
    maxWidth: 380,
    width: '100%',
    boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
  },
  overlayTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 32,
    fontWeight: 700,
    color: 'var(--accent)',
    marginBottom: 8,
    textShadow: '0 0 20px rgba(212,160,60,0.5)',
  },
  overlayMethod: {
    color: 'var(--text-secondary)',
    fontSize: 16,
    marginBottom: 28,
  },
  overlayBtns: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  drawBanner: {
    background: 'rgba(212,160,60,0.15)',
    border: '1px solid var(--accent)',
    borderRadius: 10,
    padding: '8px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: 13,
    color: 'var(--accent)',
    fontWeight: 600,
  },
  drawBannerBtn: {
    padding: '5px 14px',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    border: 'none',
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  loadingOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 100,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    color: 'var(--accent)',
    fontSize: 16,
    fontWeight: 600,
  },
  shareBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    border: '1.5px solid var(--glass-border)',
    background: 'rgba(255,255,255,0.06)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
};

// ── Component ────────────────────────────────────────────────────────────────

export default function GameScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { user, token } = useAuth();

  // Read from URL search params OR route state (lobby navigates with state)
  const st = location.state || {};
  const mode = searchParams.get('mode') || st.mode || 'local';
  const paramGameId = searchParams.get('game_id') || st.game_id;
  const paramMyColor = searchParams.get('my_color') || st.my_color || 'w';
  const initialFen = searchParams.get('fen') || st.fen || undefined;
  const timeControl = parseInt(searchParams.get('time_control') || st.time_control || '600', 10);
  const difficulty = searchParams.get('difficulty') || st.difficulty;

  // Refs
  const chessRef = useRef(new Chess(initialFen));
  const wsRef = useRef(null);
  const localTimerRef = useRef(null);
  const moveListRef = useRef(null);

  // State
  const [gameId, setGameId] = useState(paramGameId || null);
  const [myColor, setMyColor] = useState(paramMyColor);
  const [fen, setFen] = useState(chessRef.current.fen());
  const [orientation, setOrientation] = useState(
    mode === 'local' ? 'white' : paramMyColor === 'b' ? 'black' : 'white'
  );
  const [lastMove, setLastMove] = useState(null);
  const [moveHistory, setMoveHistory] = useState([]);
  const [whiteTime, setWhiteTime] = useState(timeControl);
  const [blackTime, setBlackTime] = useState(timeControl);
  const [gameOver, setGameOver] = useState(null); // { result, method }
  const [drawOffered, setDrawOffered] = useState(false);
  const [confirmResign, setConfirmResign] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [hoveredSquare, setHoveredSquare] = useState(null);
  const [botLoading, setBotLoading] = useState(mode === 'bot' && !paramGameId && !!token);
  const [botError, setBotError] = useState(null);

  const isOnline = mode === 'online' || mode === 'bot';
  const turn = chessRef.current.turn(); // 'w' | 'b'
  const isMyTurn = mode === 'local' ? true : turn === myColor;

  // ── Board size ─────────────────────────────────────────────────────────────

  const [boardWidth, setBoardWidth] = useState(
    Math.min(600, window.innerWidth - 32)
  );

  useEffect(() => {
    const onResize = () =>
      setBoardWidth(Math.min(600, window.innerWidth - 32));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── Create bot game via API ──────────────────────────────────────────────

  useEffect(() => {
    if (mode !== 'bot' || paramGameId) return;

    // Need auth for bot games
    if (!token) {
      setBotLoading(false);
      setBotError('Please log in to play against the bot.');
      return;
    }

    let cancelled = false;
    setBotLoading(true);
    setBotError(null);

    const body = {
      mode: 'bot',
      time_control: timeControl,
      increment: 0,
      bot_difficulty: parseInt(difficulty || '4', 10),
      color: 'white',
    };
    console.log('Creating bot game with:', body);

    api.createGame(body)
      .then((data) => {
        if (cancelled) return;
        console.log('Bot game created:', data);
        const game = data.game || data;
        const gId = game.id || game.ID;
        // We requested color: 'white', so we're always white
        setGameId(gId);
        setMyColor('w');
        setOrientation('white');
        setBotLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to create bot game:', err);
        setBotLoading(false);
        setBotError(err.message || 'Failed to create bot game');
      });

    return () => { cancelled = true; };
  }, [mode, paramGameId, token, difficulty, timeControl, user]);

  // ── WebSocket (online / bot) ───────────────────────────────────────────────

  const handleWsMessage = useCallback(
    (msg) => {
      const { type, payload } = msg;
      console.log('WS message:', type, payload);

      if (type === 'move_made') {
        const chess = chessRef.current;
        // If payload includes FEN, load it directly for reliability
        if (payload.fen) {
          chess.load(payload.fen);
          setFen(payload.fen);
        } else {
          const move = chess.move({
            from: payload.from,
            to: payload.to,
            promotion: payload.promotion || undefined,
          });
          if (move) {
            setFen(chess.fen());
          }
        }
        setLastMove({ from: payload.from, to: payload.to });
        setMoveHistory(chess.history());

        // Update clocks from server
        if (payload.white_time != null) setWhiteTime(payload.white_time);
        if (payload.black_time != null) setBlackTime(payload.black_time);

        checkLocalGameOver(chess);
      }

      if (type === 'time_update') {
        if (payload.white_time != null) setWhiteTime(payload.white_time);
        if (payload.black_time != null) setBlackTime(payload.black_time);
      }

      if (type === 'game_over') {
        setGameOver({ result: payload.result, method: payload.method });
      }

      if (type === 'draw_offered') {
        setDrawOffered(true);
      }

      if (type === 'game_state') {
        // Initial game state sent on connect
        const chess = chessRef.current;
        if (payload.fen) {
          chess.load(payload.fen);
          setFen(payload.fen);
          setMoveHistory(chess.history());
        }
        if (payload.white_time != null) setWhiteTime(payload.white_time);
        if (payload.black_time != null) setBlackTime(payload.black_time);
      }
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    if (!isOnline || !gameId || !token) return;
    const ws = new WebSocketService(
      `/game/${gameId}`,
      token,
      handleWsMessage
    );
    ws.connect();
    wsRef.current = ws;
    return () => ws.close();
  }, [isOnline, gameId, token, handleWsMessage]);

  // ── Local clock ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (mode !== 'local' || gameOver) return;

    localTimerRef.current = setInterval(() => {
      const t = chessRef.current.turn();
      if (t === 'w') {
        setWhiteTime((prev) => {
          if (prev <= 1) {
            setGameOver({ result: '0-1', method: 'timeout' });
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime((prev) => {
          if (prev <= 1) {
            setGameOver({ result: '1-0', method: 'timeout' });
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(localTimerRef.current);
  }, [mode, gameOver]);

  // ── Exit warning (online) ──────────────────────────────────────────────────

  useEffect(() => {
    if (mode !== 'online' || gameOver) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [mode, gameOver]);

  // ── Scroll move list to bottom ─────────────────────────────────────────────

  useEffect(() => {
    if (moveListRef.current) {
      moveListRef.current.scrollTop = moveListRef.current.scrollHeight;
    }
  }, [moveHistory]);

  // ── Check game over locally (checkmate / draw) ────────────────────────────

  const checkLocalGameOver = useCallback((chess) => {
    if (chess.isCheckmate()) {
      const winner = chess.turn() === 'w' ? '0-1' : '1-0';
      setGameOver({ result: winner, method: 'checkmate' });
    } else if (chess.isStalemate()) {
      setGameOver({ result: 'draw', method: 'stalemate' });
    } else if (chess.isDraw()) {
      setGameOver({ result: 'draw', method: 'insufficient' });
    } else if (chess.isThreefoldRepetition()) {
      setGameOver({ result: 'draw', method: 'repetition' });
    }
  }, []);

  // ── Apply move (shared by click + drag) ─────────────────────────────────

  const applyMove = useCallback(
    (from, to, promotion) => {
      const chess = chessRef.current;
      const move = chess.move({ from, to, promotion });
      if (!move) return false;

      setFen(chess.fen());
      setLastMove({ from, to });
      setMoveHistory(chess.history());
      setSelectedSquare(null);

      // Send over WS
      if (isOnline && wsRef.current) {
        wsRef.current.send('move', {
          from,
          to,
          promotion: promotion || undefined,
        });
      }

      // Local mode: flip board
      if (mode === 'local') {
        setOrientation((prev) => (prev === 'white' ? 'black' : 'white'));
      }

      checkLocalGameOver(chess);
      return true;
    },
    [isOnline, mode, checkLocalGameOver]
  );

  // ── onPieceDrop ────────────────────────────────────────────────────────────

  const onPieceDrop = useCallback(
    ({ sourceSquare, targetSquare, piece }) => {
      if (gameOver) return false;
      if (isOnline && !isMyTurn) return false;

      // piece is { pieceType: "wP", position: "e2", isSparePiece: false }
      const pt = piece?.pieceType || '';
      const isPromotion =
        pt[1] === 'P' &&
        ((pt[0] === 'w' && targetSquare[1] === '8') ||
          (pt[0] === 'b' && targetSquare[1] === '1'));
      const promotion = isPromotion ? 'q' : undefined;

      return applyMove(sourceSquare, targetSquare, promotion);
    },
    [gameOver, isOnline, isMyTurn, applyMove]
  );

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleResign = () => {
    if (!confirmResign) {
      setConfirmResign(true);
      return;
    }
    if (isOnline && wsRef.current) {
      wsRef.current.send('resign', {});
    }
    const result = myColor === 'w' ? '0-1' : '1-0';
    setGameOver({ result, method: 'resignation' });
    setConfirmResign(false);
  };

  const handleDrawOffer = () => {
    if (isOnline && wsRef.current) {
      wsRef.current.send('draw_offer', {});
    }
  };

  const handleDrawAccept = () => {
    if (isOnline && wsRef.current) {
      wsRef.current.send('draw_response', { accept: true });
    }
    setGameOver({ result: 'draw', method: 'agreement' });
    setDrawOffered(false);
  };

  const handleDrawDecline = () => {
    setDrawOffered(false);
  };

  const handleFlip = () => {
    setOrientation((prev) => (prev === 'white' ? 'black' : 'white'));
  };

  // ── Share helpers ──────────────────────────────────────────────────────────

  const getShareText = useCallback(() => {
    if (!gameOver) return '';
    const res = resultLabel(gameOver.result, gameOver.method, mode, myColor);
    const method = gameOver.method ? ` ${methodLabel(gameOver.method)}` : '';
    const moves = moveHistory.length;
    return `${res}${method} in ${moves} moves on Chessd! Play me at https://chessd.games`;
  }, [gameOver, mode, myColor, moveHistory]);

  const shareToWhatsApp = useCallback(() => {
    const text = encodeURIComponent(getShareText() + '\n\nJoin our community: https://chat.whatsapp.com/KrjLWxpbFCBFRc3QjRHxVC?mode=hqctcli');
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }, [getShareText]);

  const shareToTelegram = useCallback(() => {
    const text = encodeURIComponent(getShareText());
    const url = encodeURIComponent('https://t.me/chessdke');
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
  }, [getShareText]);

  const shareGeneric = useCallback(async () => {
    const text = getShareText();
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Chessd Game Result', text, url: 'https://chessd.games' });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard?.writeText(text);
      alert('Result copied to clipboard!');
    }
  }, [getShareText]);

  const handleNewGame = () => {
    chessRef.current = new Chess();
    setFen(chessRef.current.fen());
    setMoveHistory([]);
    setLastMove(null);
    setGameOver(null);
    setWhiteTime(timeControl);
    setBlackTime(timeControl);
    setOrientation('white');
    setConfirmResign(false);
    setDrawOffered(false);
  };

  // ── Click-to-move ────────────────────────────────────────────────────────

  const legalMovesForSquare = useCallback(
    (sq) => {
      if (!sq) return [];
      const chess = chessRef.current;
      try {
        return chess.moves({ square: sq, verbose: true });
      } catch {
        return [];
      }
    },
    [fen] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const selectedMoves = useMemo(
    () => legalMovesForSquare(selectedSquare),
    [selectedSquare, legalMovesForSquare]
  );

  const hoveredMoves = useMemo(
    () => {
      if (selectedSquare || !hoveredSquare || gameOver) return [];
      const chess = chessRef.current;
      const piece = chess.get(hoveredSquare);
      if (!piece) return [];
      if (isOnline && piece.color !== myColor) return [];
      if (piece.color !== chess.turn()) return [];
      return legalMovesForSquare(hoveredSquare);
    },
    [hoveredSquare, selectedSquare, gameOver, isOnline, myColor, legalMovesForSquare]
  );

  const onSquareClick = useCallback(
    ({ square }) => {
      if (gameOver) return;

      const chess = chessRef.current;

      // If a piece is already selected, try to move to the clicked square
      if (selectedSquare) {
        // Clicked the same square — deselect
        if (square === selectedSquare) {
          setSelectedSquare(null);
          return;
        }

        // Check if this is a legal move destination
        const moveObj = selectedMoves.find((m) => m.to === square);
        if (moveObj) {
          const isPromotion =
            moveObj.piece === 'p' &&
            ((moveObj.color === 'w' && square[1] === '8') ||
              (moveObj.color === 'b' && square[1] === '1'));
          const promotion = isPromotion ? 'q' : undefined;
          applyMove(selectedSquare, square, promotion);
          return;
        }

        // Clicked another of own pieces — switch selection
        const piece = chess.get(square);
        if (piece && piece.color === chess.turn()) {
          if (isOnline && chess.turn() !== myColor) return;
          setSelectedSquare(square);
          return;
        }

        // Invalid — deselect
        setSelectedSquare(null);
        return;
      }

      // No piece selected yet — select if it's the right color
      const piece = chess.get(square);
      if (!piece) return;
      if (isOnline && piece.color !== myColor) return;
      if (piece.color !== chess.turn()) return;

      setSelectedSquare(square);
    },
    [gameOver, selectedSquare, selectedMoves, isOnline, myColor, applyMove]
  );

  const onMouseOverSquare = useCallback(({ square }) => {
    setHoveredSquare(square);
  }, []);

  const onMouseOutSquare = useCallback(() => {
    setHoveredSquare(null);
  }, []);

  // ── Highlight squares ─────────────────────────────────────────────────────

  const customSquareStyles = useMemo(() => {
    const sq = {};

    // Last move highlight
    if (lastMove) {
      const hl = { backgroundColor: 'rgba(212,160,60,0.3)' };
      sq[lastMove.from] = hl;
      sq[lastMove.to] = hl;
    }

    // Determine which moves to show (selected takes priority over hovered)
    const activeMoves = selectedSquare ? selectedMoves : hoveredMoves;
    const activeSquare = selectedSquare || (hoveredMoves.length > 0 ? hoveredSquare : null);

    // Highlight the active piece square
    if (activeSquare) {
      sq[activeSquare] = {
        ...sq[activeSquare],
        backgroundColor: selectedSquare
          ? 'rgba(212,160,60,0.5)'
          : 'rgba(212,160,60,0.25)',
      };
    }

    // Legal move destinations
    const chess = chessRef.current;
    for (const move of activeMoves) {
      const isCapture = move.captured || chess.get(move.to);
      if (isCapture) {
        // Ring highlight for captures
        sq[move.to] = {
          ...sq[move.to],
          background: 'radial-gradient(transparent 55%, rgba(212,160,60,0.4) 55%)',
          borderRadius: '50%',
        };
      } else {
        // Dot for empty square moves
        sq[move.to] = {
          ...sq[move.to],
          background: 'radial-gradient(rgba(212,160,60,0.5) 22%, transparent 22%)',
        };
      }
    }

    return sq;
  }, [lastMove, selectedSquare, selectedMoves, hoveredSquare, hoveredMoves]);

  // Only allow dragging your own pieces
  const canDragPiece = useCallback(
    ({ piece }) => {
      if (gameOver) return false;
      const pt = piece?.pieceType || '';
      const color = pt[0]; // 'w' or 'b'
      if (mode === 'local') {
        return color === chessRef.current.turn();
      }
      return color === myColor && chessRef.current.turn() === myColor;
    },
    [gameOver, mode, myColor, fen] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Build chessboard options object for v5 API
  const boardOptions = useMemo(() => ({
    id: 'game-board',
    position: fen,
    onPieceDrop: (args) => {
      setSelectedSquare(null);
      return onPieceDrop(args);
    },
    onSquareClick,
    onMouseOverSquare,
    onMouseOutSquare,
    canDragPiece,
    boardOrientation: orientation,
    boardStyle: { borderRadius: 8, overflow: 'hidden' },
    darkSquareStyle: { backgroundColor: '#B58863' },
    lightSquareStyle: { backgroundColor: '#E8D5B5' },
    squareStyles: customSquareStyles,
    animationDurationInMs: 200,
  }), [fen, onPieceDrop, onSquareClick, onMouseOverSquare, onMouseOutSquare, canDragPiece, orientation, customSquareStyles]);

  // ── Player info ────────────────────────────────────────────────────────────

  const myName = user?.username || 'You';
  const opponentName =
    mode === 'local'
      ? orientation === 'white'
        ? 'Black'
        : 'White'
      : mode === 'bot'
        ? `Bot Joel (Lvl ${difficulty || '?'})`
        : 'Opponent';

  // Top player is the opponent (from board perspective)
  const topIsWhite = orientation === 'black';
  const topName = mode === 'local'
    ? (topIsWhite ? 'White' : 'Black')
    : opponentName;
  const topTime = topIsWhite ? whiteTime : blackTime;
  const topActive = topIsWhite ? turn === 'w' : turn === 'b';

  const bottomIsWhite = orientation === 'white';
  const bottomName = mode === 'local'
    ? (bottomIsWhite ? 'White' : 'Black')
    : myName;
  const bottomTime = bottomIsWhite ? whiteTime : blackTime;
  const bottomActive = bottomIsWhite ? turn === 'w' : turn === 'b';

  // ── Captured pieces ────────────────────────────────────────────────────────
  const { whiteCaptured, blackCaptured, advantage } = useMemo(
    () => getCapturedPieces(fen),
    [fen]
  );

  // Top player's captures (pieces they won)
  const topCaptured = topIsWhite ? whiteCaptured : blackCaptured;
  const topColor = topIsWhite ? 'w' : 'b';
  const bottomCaptured = bottomIsWhite ? whiteCaptured : blackCaptured;
  const bottomColor = bottomIsWhite ? 'w' : 'b';

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <AnimatedBackground />
      <div style={s.wrapper}>
        <div style={s.container}>
          {/* Top player bar */}
          <div style={s.playerBar}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
              <span style={s.playerName}>{topName}</span>
              <CapturedPieces pieces={topCaptured} color={topColor} advantage={advantage} />
            </div>
            <span
              style={{
                ...s.clock,
                ...(topActive && !gameOver ? s.clockActive : s.clockInactive),
              }}
            >
              {formatTime(topTime)}
            </span>
          </div>

          {/* Draw offer banner */}
          {drawOffered && !gameOver && (
            <div style={s.drawBanner}>
              <span>Opponent offers a draw</span>
              <div>
                <button
                  style={{
                    ...s.drawBannerBtn,
                    background: 'var(--accent)',
                    color: 'var(--bg-dark)',
                  }}
                  onClick={handleDrawAccept}
                >
                  Accept
                </button>
                <button
                  style={{
                    ...s.drawBannerBtn,
                    background: 'transparent',
                    color: 'var(--accent)',
                    border: '1px solid var(--accent)',
                  }}
                  onClick={handleDrawDecline}
                >
                  Decline
                </button>
              </div>
            </div>
          )}

          {/* Chess board */}
          <div style={{ width: boardWidth, maxWidth: '100%' }}>
            <Chessboard options={boardOptions} />
          </div>

          {/* Bottom player bar */}
          <div style={s.playerBar}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
              <span style={s.playerName}>{bottomName}</span>
              <CapturedPieces pieces={bottomCaptured} color={bottomColor} advantage={advantage} />
            </div>
            <span
              style={{
                ...s.clock,
                ...(bottomActive && !gameOver
                  ? s.clockActive
                  : s.clockInactive),
              }}
            >
              {formatTime(bottomTime)}
            </span>
          </div>

          {/* Controls — always rendered to prevent layout shift */}
          <div style={{ ...s.controls, visibility: gameOver ? 'hidden' : 'visible' }}>
            {(isOnline || mode === 'bot') && (
              <>
                <button
                  style={{ ...s.btnBase, ...s.btnResign }}
                  onClick={handleResign}
                >
                  {confirmResign ? 'Confirm?' : 'Resign'}
                </button>
                <button
                  style={{ ...s.btnBase, ...s.btnDraw }}
                  onClick={handleDrawOffer}
                >
                  Draw
                </button>
              </>
            )}
            {mode === 'local' && (
              <>
                <button
                  style={{ ...s.btnBase, ...s.btnResign }}
                  onClick={handleResign}
                >
                  {confirmResign ? 'Confirm?' : 'Resign'}
                </button>
                <button
                  style={{ ...s.btnBase, ...s.btnFlip }}
                  onClick={handleFlip}
                >
                  Flip Board
                </button>
              </>
            )}
          </div>

          {/* Move list — always rendered with fixed height to prevent layout shift */}
          <div style={s.moveList} ref={moveListRef}>
            {moveHistory.length > 0 ? (
              moveHistory.map((move, i) =>
                i % 2 === 0 ? (
                  <span key={i}>
                    <span style={s.moveNumber}>{Math.floor(i / 2) + 1}.</span>
                    <span style={s.moveText}>{move}</span>
                  </span>
                ) : (
                  <span key={i} style={s.moveText}>
                    {move}
                  </span>
                )
              )
            ) : (
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Moves will appear here</span>
            )}
          </div>
        </div>
      </div>

      {/* Bot loading / error overlay */}
      {(botLoading || botError) && (
        <div style={s.loadingOverlay}>
          {botLoading && <div className="spinner" />}
          {botLoading && <span style={s.loadingText}>Setting up bot game...</span>}
          {botError && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#EF5350', fontSize: 16, marginBottom: 16 }}>{botError}</p>
              <button className="btn-accent" style={{ maxWidth: 200 }} onClick={() => navigate('/')}>
                Back to Menu
              </button>
            </div>
          )}
        </div>
      )}

      {/* Game over overlay */}
      {gameOver && (
        <div style={s.overlay}>
          <div style={s.overlayCard}>
            <h2 style={s.overlayTitle}>
              {resultLabel(gameOver.result, gameOver.method, mode, myColor)}
            </h2>
            {gameOver.method && (
              <p style={s.overlayMethod}>{methodLabel(gameOver.method)}</p>
            )}

            {/* Share buttons */}
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 12, marginTop: 0 }}>
              Share your result
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 24 }}>
              <button onClick={shareToWhatsApp} style={s.shareBtn} title="Share on WhatsApp">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#25D366">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </button>
              <button onClick={shareToTelegram} style={s.shareBtn} title="Share on Telegram">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#26A5E4">
                  <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0h-.056zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </button>
              <button onClick={shareGeneric} style={s.shareBtn} title="Share / Copy">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--text-primary)" stroke="none">
                  <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
                </svg>
              </button>
            </div>

            <div style={s.overlayBtns}>
              <button
                className="btn-accent"
                onClick={() => navigate('/')}
              >
                Back to Menu
              </button>
              {mode === 'local' && (
                <button className="btn-outline" onClick={handleNewGame}>
                  New Game
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
