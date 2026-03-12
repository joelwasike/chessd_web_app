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
    maxHeight: 120,
    overflowY: 'auto',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '2px 0',
    fontSize: 13,
    color: 'var(--text-secondary)',
    lineHeight: 1.8,
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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <AnimatedBackground />
      <div style={s.wrapper}>
        <div style={s.container}>
          {/* Top player bar */}
          <div style={s.playerBar}>
            <span style={s.playerName}>{topName}</span>
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
            <span style={s.playerName}>{bottomName}</span>
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

          {/* Controls */}
          {!gameOver && (
            <div style={s.controls}>
              {isOnline && (
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
          )}

          {/* Move list */}
          {moveHistory.length > 0 && (
            <div style={s.moveList} ref={moveListRef}>
              {moveHistory.map((move, i) =>
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
              )}
            </div>
          )}
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
