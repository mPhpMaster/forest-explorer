import React, { useRef, useEffect, useState } from 'react';

const BrotatoGame = () => {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState({
    wave: 1,
    hp: 100,
    maxHp: 100,
    xp: 0,
    gold: 0,
    enemies: 0,
    paused: false,
    gameOver: false,
    shopOpen: false
  });
  const [stats, setStats] = useState({
    damage: 10,
    attackSpeed: 15,
    moveSpeed: 3,
    maxHp: 100,
    armor: 0
  });

  const shopItems = [
    { name: 'Damage Up', cost: 15, stat: 'damage', value: 5, desc: '+5 Damage' },
    { name: 'Attack Speed', cost: 20, stat: 'attackSpeed', value: -3, desc: 'Shoot Faster' },
    { name: 'Move Speed', cost: 15, stat: 'moveSpeed', value: 0.5, desc: '+0.5 Speed' },
    { name: 'Max HP', cost: 25, stat: 'maxHp', value: 20, desc: '+20 Max HP' },
    { name: 'Armor', cost: 30, stat: 'armor', value: 2, desc: '+2 Armor' },
    { name: 'Heal', cost: 10, stat: 'heal', value: 30, desc: 'Restore 30 HP' }
  ];

  const buyItem = (item) => {
    if (gameState.gold >= item.cost) {
      setGameState(prev => ({ ...prev, gold: prev.gold - item.cost }));

      if (item.stat === 'heal') {
        setGameState(prev => ({ ...prev, hp: Math.min(prev.maxHp, prev.hp + item.value) }));
      } else {
        setStats(prev => {
          const newStats = { ...prev, [item.stat]: prev[item.stat] + item.value };
          if (item.stat === 'maxHp') {
            setGameState(p => ({ ...p, maxHp: newStats.maxHp, hp: p.hp + item.value }));
          }
          return newStats;
        });
      }
    }
  };

  const closeShop = () => {
    setGameState(prev => ({ ...prev, shopOpen: false }));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = 800;
    canvas.height = 600;

    let player = {
      x: 400,
      y: 300,
      size: 20,
      speed: stats.moveSpeed,
      hp: gameState.hp,
      maxHp: stats.maxHp,
      xp: gameState.xp,
      gold: gameState.gold
    };

    let enemies = [];
    let projectiles = [];
    let particles = [];
    let wave = gameState.wave;
    let waveTimer = 0;
    const waveDuration = 900; // 15 seconds at 60fps
    let gameRunning = !gameState.shopOpen && !gameState.gameOver;
    let shootCooldown = 0;

    const keys = {};
    const handleKeyDown = (e) => { keys[e.key] = true; };
    const handleKeyUp = (e) => { keys[e.key] = false; };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Enemy types
    const enemyTypes = [
      { color: '#8b1e3f', speed: 0.8, hp: 2, size: 15, gold: 2, damage: 5 }, // Basic
      { color: '#e63946', speed: 1.5, hp: 1, size: 12, gold: 3, damage: 3 }, // Fast
      { color: '#2a9d8f', speed: 0.5, hp: 8, size: 22, gold: 5, damage: 10 }, // Tank
      { color: '#f4a261', speed: 1.0, hp: 4, size: 16, gold: 4, damage: 7 }  // Elite
    ];

    const spawnEnemy = () => {
      const side = Math.floor(Math.random() * 4);
      let x, y;

      switch (side) {
        case 0: x = Math.random() * canvas.width; y = -30; break;
        case 1: x = canvas.width + 30; y = Math.random() * canvas.height; break;
        case 2: x = Math.random() * canvas.width; y = canvas.height + 30; break;
        case 3: x = -30; y = Math.random() * canvas.height; break;
        default: break;
      }

      // Select enemy type based on wave
      let typeIndex = 0;
      const rand = Math.random();
      if (wave >= 3 && rand < 0.3) typeIndex = 1;
      if (wave >= 5 && rand < 0.2) typeIndex = 2;
      if (wave >= 7 && rand < 0.15) typeIndex = 3;

      const type = enemyTypes[typeIndex];
      enemies.push({
        x, y,
        size: type.size,
        speed: type.speed + wave * 0.05,
        hp: type.hp + wave,
        maxHp: type.hp + wave,
        damage: type.damage,
        gold: type.gold,
        color: type.color
      });
    };

    const createParticle = (x, y, color) => {
      for (let i = 0; i < 8; i++) {
        particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          life: 30,
          color
        });
      }
    };

    const autoShoot = () => {
      if (shootCooldown > 0) {
        shootCooldown--;
        return;
      }

      if (enemies.length === 0) return;

      let nearest = enemies[0];
      let minDist = Infinity;

      enemies.forEach(enemy => {
        const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
        if (dist < minDist) {
          minDist = dist;
          nearest = enemy;
        }
      });

      const angle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
      projectiles.push({
        x: player.x,
        y: player.y,
        vx: Math.cos(angle) * 7,
        vy: Math.sin(angle) * 7,
        size: 5,
        damage: stats.damage
      });

      shootCooldown = stats.attackSpeed;
    };

    const gameLoop = () => {
      if (!gameRunning) return;

      // Clear canvas
      ctx.fillStyle = '#2d5016';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid pattern
      ctx.strokeStyle = '#3d6020';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
      for (let i = 0; i < canvas.height; i += 40) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }

      waveTimer++;
      if (waveTimer >= waveDuration) {
        wave++;
        waveTimer = 0;
        enemies = [];
        gameRunning = false;
        setGameState(prev => ({
          ...prev,
          wave,
          shopOpen: true,
          hp: player.hp,
          gold: player.gold,
          xp: player.xp
        }));
        return;
      }

      // Spawn enemies
      const spawnRate = 0.02 + wave * 0.008;
      if (Math.random() < spawnRate && enemies.length < 80) {
        spawnEnemy();
      }

      // Player movement
      player.speed = stats.moveSpeed;
      if (keys['w'] || keys['ArrowUp']) player.y -= player.speed;
      if (keys['s'] || keys['ArrowDown']) player.y += player.speed;
      if (keys['a'] || keys['ArrowLeft']) player.x -= player.speed;
      if (keys['d'] || keys['ArrowRight']) player.x += player.speed;

      player.x = Math.max(player.size, Math.min(canvas.width - player.size, player.x));
      player.y = Math.max(player.size, Math.min(canvas.height - player.size, player.y));

      autoShoot();

      // Update projectiles
      projectiles = projectiles.filter(proj => {
        proj.x += proj.vx;
        proj.y += proj.vy;
        return proj.x > -10 && proj.x < canvas.width + 10 && proj.y > -10 && proj.y < canvas.height + 10;
      });

      // Update enemies
      enemies = enemies.filter(enemy => {
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const dist = Math.hypot(dx, dy);

        if (dist > enemy.size + player.size) {
          enemy.x += (dx / dist) * enemy.speed;
          enemy.y += (dy / dist) * enemy.speed;
        } else {
          const actualDamage = Math.max(1, enemy.damage - stats.armor);
          player.hp -= actualDamage;
          createParticle(player.x, player.y, '#ff0000');
          if (player.hp <= 0) {
            gameRunning = false;
            setGameState(prev => ({ ...prev, gameOver: true, hp: 0 }));
          }
          return false;
        }

        return enemy.hp > 0;
      });

      // Collisions
      projectiles.forEach((proj, pIdx) => {
        enemies.forEach((enemy, eIdx) => {
          const dist = Math.hypot(proj.x - enemy.x, proj.y - enemy.y);
          if (dist < proj.size + enemy.size) {
            enemy.hp -= proj.damage;
            projectiles.splice(pIdx, 1);

            if (enemy.hp <= 0) {
              player.xp += 5;
              player.gold += enemy.gold;
              createParticle(enemy.x, enemy.y, enemy.color);
            }
          }
        });
      });

      // Update particles
      particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        return p.life > 0;
      });

      // Draw particles
      particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 30;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // Draw player
      ctx.fillStyle = '#d4a574';
      ctx.beginPath();
      ctx.ellipse(player.x, player.y, player.size, player.size * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(player.x - 6, player.y - 3, 3, 0, Math.PI * 2);
      ctx.arc(player.x + 6, player.y - 3, 3, 0, Math.PI * 2);
      ctx.fill();

      // Draw projectiles
      ctx.fillStyle = '#ff6b35';
      projectiles.forEach(proj => {
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw enemies
      enemies.forEach(enemy => {
        ctx.fillStyle = enemy.color;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
        ctx.fill();

        const barWidth = 30;
        const barHeight = 4;
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.size - 10, barWidth, barHeight);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.size - 10, barWidth * (enemy.hp / enemy.maxHp), barHeight);
      });

      // Wave timer bar
      const timerWidth = canvas.width * 0.8;
      const timerX = (canvas.width - timerWidth) / 2;
      ctx.fillStyle = '#333';
      ctx.fillRect(timerX, 10, timerWidth, 20);
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(timerX, 10, timerWidth * (waveTimer / waveDuration), 20);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(timerX, 10, timerWidth, 20);

      setGameState(prev => ({
        ...prev,
        hp: Math.max(0, player.hp),
        xp: player.xp,
        gold: player.gold,
        enemies: enemies.length
      }));

      requestAnimationFrame(gameLoop);
    };

    if (!gameState.shopOpen && !gameState.gameOver) {
      gameLoop();
    }

    return () => {
      gameRunning = false;
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.shopOpen, gameState.gameOver, gameState.wave, stats]);

  const restartGame = () => {
    window.location.reload();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
      <div className="mb-4 flex gap-4 text-white flex-wrap justify-center">
        <div className="bg-gray-800 px-4 py-2 rounded">
          <span className="font-bold">Wave:</span> {gameState.wave}
        </div>
        <div className="bg-gray-800 px-4 py-2 rounded">
          <span className="font-bold">HP:</span> {gameState.hp}/{gameState.maxHp}
        </div>
        <div className="bg-gray-800 px-4 py-2 rounded">
          <span className="font-bold">Gold:</span> 💰{gameState.gold}
        </div>
        <div className="bg-gray-800 px-4 py-2 rounded">
          <span className="font-bold">XP:</span> {gameState.xp}
        </div>
        <div className="bg-gray-800 px-4 py-2 rounded">
          <span className="font-bold">Enemies:</span> {gameState.enemies}
        </div>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          className="border-4 border-gray-700 rounded"
        />

        {gameState.shopOpen && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-90 rounded">
            <div className="text-center text-white max-w-2xl">
              <h2 className="text-3xl font-bold mb-2">Shop - Wave {gameState.wave}</h2>
              <p className="text-yellow-400 text-xl mb-4">Gold: 💰{gameState.gold}</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {shopItems.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => buyItem(item)}
                    disabled={gameState.gold < item.cost}
                    className={`p-3 rounded text-left ${gameState.gold >= item.cost
                      ? 'bg-green-700 hover:bg-green-600'
                      : 'bg-gray-700 opacity-50 cursor-not-allowed'
                      }`}
                  >
                    <div className="font-bold">{item.name}</div>
                    <div className="text-sm">{item.desc}</div>
                    <div className="text-yellow-400 text-sm mt-1">💰{item.cost}</div>
                  </button>
                ))}
              </div>
              <button
                onClick={closeShop}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-8 rounded text-lg"
              >
                Start Wave {gameState.wave}
              </button>
            </div>
          </div>
        )}

        {gameState.gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 rounded">
            <div className="text-center text-white">
              <h2 className="text-4xl font-bold mb-4">Game Over!</h2>
              <p className="text-xl mb-2">Wave Reached: {gameState.wave}</p>
              <p className="text-xl mb-2">XP Earned: {gameState.xp}</p>
              <p className="text-xl mb-6">Gold Collected: 💰{gameState.gold}</p>
              <button
                onClick={restartGame}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded text-lg"
              >
                Restart
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 text-white text-center bg-gray-800 px-6 py-3 rounded max-w-2xl">
        <p className="font-bold mb-1">Controls: WASD or Arrow Keys | Auto-shoots at nearest enemy</p>
        <p className="text-sm text-gray-300">Survive waves, collect gold, upgrade between waves!</p>
      </div>
    </div>
  );
};

export default BrotatoGame;