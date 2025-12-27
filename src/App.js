import React, { useRef, useEffect, useState, useCallback } from 'react';
import { zzfx } from 'zzfx';

const sounds = {
  'shoot': [1.05, undefined, 68, 0.02, 0.02, 0.29, 1, 0.22, -8, 5.1, 0.31, 0.19, 0.13, undefined, -0.14, 0.26, 0.15, 0.76, 0.03],
  'hit': [1.5, undefined, 130, 0.01, 0.03, 0.27, 1, 0.13, 8, -10, 5, 0.07, 0.13, undefined, undefined, undefined, 0.86, 0.03],
  'explode': [1.4, undefined, 204, 0.02, 0.07, 0.25, 1, 0.23, 5, -10, 5, 0.07, 0.13, undefined, undefined, undefined, 0.86, 0.03],
  'coin': [0.5, undefined, 440, 0.05, 0.01, 0.1, 3, 1, 0.1, -600, 8, 0.03, undefined, 0.07, undefined, 0.1, 0.03]
};

const weapons = {
  'Pistol': { name: 'Pistol', damage: 0, attackSpeed: 100, projectiles: 1, spread: 0, projectileSpeed: 7 },
  'Shotgun': { name: 'Shotgun', damage: -2, attackSpeed: 120, projectiles: 5, spread: 0.5, projectileSpeed: 7 },
  'SMG': { name: 'SMG', damage: -4, attackSpeed: 70, projectiles: 1, spread: 0.2, projectileSpeed: 8 },
  'Assault Rifle': { name: 'Assault Rifle', damage: 2, attackSpeed: 110, projectiles: 1, spread: 0.1, projectileSpeed: 10 },
  'Sniper Rifle': { name: 'Sniper Rifle', damage: 20, attackSpeed: 200, projectiles: 1, spread: 0, projectileSpeed: 20 }
};

const specialAbilities = {
  dash: {
    cooldownTime: 300, // 5 seconds
    duration: 10, // frames
    speedMultiplier: 3
  }
};

const allShopItems = [
  { name: 'Damage Up', cost: 10, stat: 'damage', value: 5, desc: '+5 Damage' },
  { name: 'Attack Speed', cost: 15, stat: 'attackSpeed', value: -3, desc: 'Shoot Faster' },
  { name: 'Move Speed', cost: 10, stat: 'moveSpeed', value: 0.5, desc: '+1 Speed' },
  { name: 'Max HP', cost: 15, stat: 'maxHp', value: 20, desc: '+20 Max HP' },
  { name: 'Armor', cost: 20, stat: 'armor', value: 2, desc: '+2 Armor' },
  { name: 'Heal', cost: 5, stat: 'heal', value: 30, desc: 'Restore 30 HP' },
  { name: 'Shotgun', cost: 30, stat: 'weapon', weapon: 'Shotgun', desc: 'Fires multiple projectiles' },
  { name: 'SMG', cost: 40, stat: 'weapon', weapon: 'SMG', desc: 'High fire rate, low damage' },
  { name: 'Assault Rifle', cost: 60, stat: 'weapon', weapon: 'Assault Rifle', desc: 'Balanced and reliable' },
  { name: 'Sniper Rifle', cost: 80, stat: 'weapon', weapon: 'Sniper Rifle', desc: 'Slow but deadly' },
  { name: 'Dash', cost: 25, stat: 'ability', ability: 'dash', desc: 'Press Shift to dash' },
  { name: 'HP Regen', cost: 15, stat: 'hpRegen', value: 0.5, desc: '+0.5 HP/s' },
  { name: 'Life Steal', cost: 20, stat: 'lifeSteal', value: 0.05, desc: '+5% Life Steal' }
];


const BrotatoGame = () => {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState({
    wave: 1,
    paused: false,
    gameOver: false,
    shopOpen: false,
    gameStarted: false,
    hp: 100,
    xp: 0,
    gold: 0,
    maxHp: 100,
    enemies: 0,
    rerollCost: 0
  });

  const [stats, setStats] = useState({
    damage: 10,
    attackSpeed: 0,
    moveSpeed: 3,
    maxHp: 100,
    armor: 0,
    hpRegen: 0,
    lifeSteal: 0
  });
  const [playerWeapons, setPlayerWeapons] = useState([{ name: 'Pistol', level: 1 }]);
  const [abilities, setAbilities] = useState({
    dash: { unlocked: false, cooldown: 0, duration: 0 }
  });
  const [isStatsVisible, setIsStatsVisible] = useState(true);
  const [currentShopItems, setCurrentShopItems] = useState([]);

  const pausedRef = useRef(false);
  useEffect(() => {
    pausedRef.current = gameState.paused;
  }, [gameState.paused]);

  const playSound = (sound) => {
    if (zzfx) {
      zzfx(...sound);
    }
  };

  const buyItem = (item) => {
    if (gameState.gold >= item.cost) {
      playSound(sounds.coin);

      let nextHp = gameState.hp;
      if (item.stat === 'heal') {
        nextHp = Math.min(stats.maxHp, gameState.hp + item.value);
      } else if (item.stat === 'maxHp') {
        nextHp = gameState.hp + item.value;
      }

      setGameState(prev => ({ ...prev, gold: prev.gold - item.cost, hp: nextHp }));

      if (item.stat === 'weapon') {
        const existingWeaponIndex = playerWeapons.findIndex(w => w.name === item.weapon);

        if (existingWeaponIndex !== -1) {
          const newPlayerWeapons = [...playerWeapons];
          const oldWeapon = newPlayerWeapons[existingWeaponIndex];
          if (oldWeapon.level < 6) {
            newPlayerWeapons[existingWeaponIndex] = { ...oldWeapon, level: oldWeapon.level + 1 };
            setPlayerWeapons(newPlayerWeapons);
          }
        } else if (playerWeapons.length < 6) {
          setPlayerWeapons(prev => [...prev, { name: item.weapon, level: 1 }]);
        }
      } else if (item.stat === 'ability') {
        setAbilities(prev => ({ ...prev, [item.ability]: { ...prev[item.ability], unlocked: true } }));
      } else {
        setStats(prev => ({ ...prev, [item.stat]: prev[item.stat] + item.value }));
      }
    }
  };

  const generateShopItems = useCallback(() => {
    const shuffled = [...allShopItems].sort(() => 0.5 - Math.random());
    setCurrentShopItems(shuffled.slice(0, 4));
  }, []);

  const rerollShop = useCallback(() => {
    const currentRerollCost = gameState.rerollCost;
    if (gameState.gold >= currentRerollCost) {
      setGameState(prev => ({ ...prev, gold: prev.gold - currentRerollCost, rerollCost: prev.rerollCost + 1 }));
      generateShopItems();
    }
  }, [gameState.gold, gameState.rerollCost, generateShopItems]);

  const closeShop = () => {
    setGameState(prev => ({ ...prev, shopOpen: false }));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = 800;
    canvas.height = 600;

    const player = {
      x: 400,
      y: 300,
      size: 20,
      speed: stats.moveSpeed,
      hp: gameState.hp,
      maxHp: stats.maxHp,
      xp: gameState.xp,
      gold: gameState.gold,
      dx: 0, // direction x for dash
      dy: 0,  // direction y for dash
      angle: 0
    };

    const localAbilities = { ...abilities };
    const localPlayerWeapons = playerWeapons.map(w => ({ name: w.name, level: w.level, cooldown: 0 }));

    let enemies = [];
    let projectiles = [];
    let particles = [];
    let damageNumbers = [];
    let wave = gameState.wave;
    let waveTimer = 0;
    const waveDuration = 900; // 15 seconds at 60fps
    let gameRunning = !gameState.shopOpen && !gameState.gameOver && gameState.gameStarted;
    let screenshake = 0;

    const keys = {};
    const handleKeyDown = (e) => {
      keys[e.key] = true;
      if (e.key === 'Escape') {
        setGameState(prev => ({ ...prev, paused: !prev.paused }));
      }
      if (e.key === 'Shift' && localAbilities.dash.unlocked && localAbilities.dash.cooldown === 0) {
        localAbilities.dash.duration = specialAbilities.dash.duration;
        localAbilities.dash.cooldown = specialAbilities.dash.cooldownTime;
      }
    };
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
        gold: type.gold + wave,
        color: type.color
      });
    };

    const createParticle = (x, y, color) => {
      const particleCount = Math.random() * 15 + 5; // 5 to 20 particles
      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 1;
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: Math.random() * 40 + 20, // 20-60 frames life
          size: Math.random() * 3 + 1,
          color
        });
      }
    };

    const addDamageNumber = (x, y, value, color) => {
      damageNumbers.push({
        x, y, value, color,
        life: 40,
        vy: -1
      });
    };

    const gameLoop = () => {
      if (!gameRunning) return;

      if (pausedRef.current) {
        requestAnimationFrame(gameLoop);
        return;
      }

      if (screenshake > 0) {
        screenshake--;
      }
      ctx.save();
      const shakeX = (Math.random() - 0.5) * screenshake;
      const shakeY = (Math.random() - 0.5) * screenshake;
      ctx.translate(shakeX, shakeY);

      // Clear canvas with a gradient
      const gradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 50, canvas.width / 2, canvas.height / 2, 500);
      gradient.addColorStop(0, '#4a7d29');
      gradient.addColorStop(1, '#2d5016');
      ctx.fillStyle = gradient;
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
        generateShopItems();
        setGameState(prev => ({
          ...prev,
          wave,
          shopOpen: true,
          hp: player.maxHp,
          gold: player.gold,
          xp: player.xp
        }));
        setAbilities(localAbilities);
        return;
      }

      // Spawn enemies
      const spawnRate = 0.02 + wave * 0.008;
      if (Math.random() < spawnRate && enemies.length < 80) {
        spawnEnemy();
      }

      // Player movement
      let moveX = 0;
      let moveY = 0;
      if (keys['w'] || keys['ArrowUp']) moveY = -1;
      if (keys['s'] || keys['ArrowDown']) moveY = 1;
      if (keys['a'] || keys['ArrowLeft']) moveX = -1;
      if (keys['d'] || keys['ArrowRight']) moveX = 1;

      if (moveX !== 0 || moveY !== 0) {
        player.dx = moveX;
        player.dy = moveY;
      }

      if (localAbilities.dash.duration > 0) {
        const dashSpeed = player.speed * specialAbilities.dash.speedMultiplier;
        const magnitude = Math.hypot(player.dx, player.dy);
        if (magnitude > 0) {
          player.x += (player.dx / magnitude) * dashSpeed;
          player.y += (player.dy / magnitude) * dashSpeed;
        }
        localAbilities.dash.duration--;
      } else {
        const magnitude = Math.hypot(moveX, moveY);
        if (magnitude > 0) {
          player.x += (moveX / magnitude) * player.speed;
          player.y += (moveY / magnitude) * player.speed;
        }
      }

      player.speed = stats.moveSpeed;

      player.x = Math.max(player.size, Math.min(canvas.width - player.size, player.x));
      player.y = Math.max(player.size, Math.min(canvas.height - player.size, player.y));

      if (localAbilities.dash.cooldown > 0) {
        localAbilities.dash.cooldown--;
      }

      // HP Regeneration
      if (stats.hpRegen > 0 && player.hp < player.maxHp) {
        player.hp += stats.hpRegen / 60;
        if (player.hp > player.maxHp) {
          player.hp = player.maxHp;
        }
      }

      // Aiming and Shooting
      let nearestEnemy = null;
      if (enemies.length > 0) {
        let minDist = Infinity;
        enemies.forEach(enemy => {
          const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
          if (dist < minDist) {
            minDist = dist;
            nearestEnemy = enemy;
          }
        });

        if (nearestEnemy) {
          player.angle = Math.atan2(nearestEnemy.y - player.y, nearestEnemy.x - player.x);
        }
      }
      // --- WEAPON FIRING ---
      const baseAngle = player.angle;
      if (nearestEnemy) {
        localPlayerWeapons.forEach(weapon => {
          if (weapon.cooldown > 0) {
            weapon.cooldown--;
          } else {
            const weaponData = weapons[weapon.name];
            const totalDamage = stats.damage + weaponData.damage + (weapon.level - 1); // +1 damage per level
            playSound(sounds.shoot);
            for (let i = 0; i < weaponData.projectiles; i++) {
              const angle = baseAngle + (Math.random() - 0.5) * weaponData.spread;
              projectiles.push({
                x: player.x,
                y: player.y,
                vx: Math.cos(angle) * weaponData.projectileSpeed,
                vy: Math.sin(angle) * weaponData.projectileSpeed,
                size: 5,
                damage: totalDamage
              });
            }
            weapon.cooldown = stats.attackSpeed + weaponData.attackSpeed;
          }
        });
      }

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
          playSound(sounds.hit);
          addDamageNumber(player.x, player.y, actualDamage, '#ff0000');
          screenshake = 15;
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
            const damageDealt = proj.damage;
            enemy.hp -= damageDealt;
            addDamageNumber(enemy.x, enemy.y, damageDealt, '#fff');
            projectiles.splice(pIdx, 1);

            // Life Steal
            if (stats.lifeSteal > 0) {
              const lifeStolen = damageDealt * stats.lifeSteal;
              player.hp = Math.min(player.maxHp, player.hp + lifeStolen);
            }

            if (enemy.hp <= 0) {
              player.xp += 5;
              player.gold += enemy.gold;
              playSound(sounds.explode);
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
        ctx.globalAlpha = Math.max(0, p.life / 60); // Use max life for alpha calculation
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // Draw player
      ctx.save();
      ctx.translate(player.x, player.y);

      // Body
      ctx.fillStyle = localAbilities.dash.duration > 0 ? '#fff' : '#d4a574';
      ctx.beginPath();
      ctx.arc(0, 0, player.size, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(-7, -3, 3, 0, Math.PI * 2);
      ctx.arc(7, -3, 3, 0, Math.PI * 2);
      ctx.fill();

      // Gun
      const gunAngle = player.angle || 0;
      ctx.rotate(gunAngle);
      ctx.fillStyle = '#666';
      ctx.fillRect(10, -4, 20, 8);
      ctx.restore();


      // Player HP bar
      const barWidth = 40;
      const barHeight = 8;
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(player.x - barWidth / 2, player.y - player.size - 15, barWidth, barHeight);
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(player.x - barWidth / 2, player.y - player.size - 15, barWidth * (player.hp / player.maxHp), barHeight);
      ctx.fillStyle = '#000';
      ctx.font = '8px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.ceil(player.hp)}/${player.maxHp}`, player.x, player.y - player.size - 8);

      // Draw projectiles
      projectiles.forEach(proj => {
        ctx.save();
        ctx.translate(proj.x, proj.y);
        const angle = Math.atan2(proj.vy, proj.vx);
        ctx.rotate(angle);
        ctx.fillStyle = '#ff6b35';
        // Draw a bullet shape
        ctx.fillRect(-proj.size, -proj.size / 4, proj.size * 1.5, proj.size / 2);
        // Add a bit of a glow
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(-proj.size, -proj.size / 4, proj.size, proj.size / 2);
        ctx.restore();
      });

      // Draw enemies
      enemies.forEach(enemy => {
        ctx.fillStyle = enemy.color;
        ctx.beginPath();
        const wobble = Math.sin(Date.now() / (200 + enemy.speed * 20)) * 2;
        ctx.arc(enemy.x, enemy.y, enemy.size + wobble, 0, Math.PI * 2);
        ctx.fill();

        const barWidth = 30;
        const barHeight = 4;
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.size - 10, barWidth, barHeight);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.size - 10, barWidth * (enemy.hp / enemy.maxHp), barHeight);
      });

      // Wave timer text
      const timeRemaining = Math.ceil((waveDuration - waveTimer) / 60);
      const timerText = `Time: ${timeRemaining}s`;
      ctx.font = 'bold 18px "Courier New", Courier, monospace';
      ctx.fillStyle = 'white';
      ctx.shadowColor = 'black';
      ctx.shadowBlur = 7;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.textAlign = 'center';
      ctx.fillText(timerText, canvas.width / 2, 20);
      // Reset shadow
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Dash Cooldown UI
      if (localAbilities.dash.unlocked) {
        const dashBarWidth = 100;
        const dashBarHeight = 10;
        const dashBarX = (canvas.width - dashBarWidth) / 2;
        const dashBarY = 50;
        ctx.fillStyle = '#333';
        ctx.fillRect(dashBarX, dashBarY, dashBarWidth, dashBarHeight);
        ctx.fillStyle = '#00bcd4';
        const cooldownProgress = 1 - (localAbilities.dash.cooldown / specialAbilities.dash.cooldownTime);
        ctx.fillRect(dashBarX, dashBarY, dashBarWidth * cooldownProgress, dashBarHeight);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(dashBarX, dashBarY, dashBarWidth, dashBarHeight);

        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Base text for dark background
        ctx.fillStyle = '#fff';
        ctx.fillText('Dash', canvas.width / 2, dashBarY + 5);

        // Draw a contrasting text color clipped to the progress area
        ctx.save();
        ctx.beginPath();
        ctx.rect(dashBarX, dashBarY, dashBarWidth * cooldownProgress, dashBarHeight);
        ctx.clip();
        ctx.fillStyle = '#000'; // Black text for the cyan bar
        ctx.fillText('Dash', canvas.width / 2, dashBarY + 5);
        ctx.restore();
      }

      // Draw Damage Numbers
      damageNumbers = damageNumbers.filter(dn => dn.life > 0);
      damageNumbers.forEach(dn => {
        dn.y += dn.vy;
        dn.life--;
        ctx.fillStyle = dn.color;
        ctx.font = 'bold 14px Arial';
        ctx.fillText(Math.floor(dn.value), dn.x, dn.y);
      });

      ctx.restore();

      setGameState(prev => ({
        ...prev,
        hp: Math.max(0, player.hp),
        xp: player.xp,
        gold: player.gold,
        enemies: enemies.length
      }));

      requestAnimationFrame(gameLoop);
    };

    if (!gameState.shopOpen && !gameState.gameOver && gameState.gameStarted) {
      gameLoop();
    }

    return () => {
      gameRunning = false;
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.shopOpen, gameState.gameOver, gameState.gameStarted, gameState.wave, stats, playerWeapons, abilities, generateShopItems]);

  const restartGame = () => {
    window.location.reload();
  };

  return (
    <div className="flex flex-row items-start justify-center min-h-screen p-4 text-white bg-gray-900">
      {/* Stats Panel */}
      <div className="fixed z-10 w-64 bg-gray-800 rounded-lg shadow-lg top-4 left-4">
        <button
          onClick={() => setIsStatsVisible(!isStatsVisible)}
          className="w-full px-4 py-2 text-xl font-bold text-left bg-gray-700 rounded-t-lg hover:bg-gray-600 focus:outline-none"
        >
          Player Stats {isStatsVisible ? '▲' : '▼'}
        </button>
        {isStatsVisible && (
          <div className="p-4">
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div><span className="font-bold">XP:</span> {gameState.xp}</div>
              <hr className="my-2 border-gray-600" />
              <div><span className="font-bold">Damage:</span> {stats.damage}</div>
              <div><span className="font-bold">Attack Speed:</span> {-stats.attackSpeed}</div>
              <div><span className="font-bold">Move Speed:</span> {stats.moveSpeed.toFixed(0)}</div>
              <div><span className="font-bold">Armor:</span> {stats.armor}</div>
              <div><span className="font-bold">HP Regen:</span> {(stats.hpRegen).toFixed(0)}</div>
              <div><span className="font-bold">Life Steal:</span> {(stats.lifeSteal * 100).toFixed(0)}%</div>
              <hr className="my-2 border-gray-600" />
              <div>
                <span className="font-bold">Weapons:</span>
                <ul className="list-disc list-inside">
                  {playerWeapons.map((w, i) => <li key={i}>{w.name} (Lv.{w.level})</li>)}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center">
        <div className="flex flex-wrap justify-center gap-4 mb-4 text-white">
          <div className="px-4 py-2 bg-gray-800 rounded">
            <span className="font-bold">Wave:</span> {gameState.wave}
          </div>
          <div className="px-4 py-2 bg-gray-800 rounded">
            <span className="font-bold">HP:</span> {Math.ceil(gameState.hp)} / {gameState.maxHp}
          </div>
          <div className="px-4 py-2 bg-gray-800 rounded">
            <span className="font-bold">Gold:</span> 💰{gameState.gold}
          </div>
          <div className="px-4 py-2 bg-gray-800 rounded">
            <span className="font-bold">Enemies:</span> {gameState.enemies}
          </div>
        </div>

        <div className="relative">
          <canvas
            ref={canvasRef}
            className="border-4 border-gray-700 rounded"
          />

          {!gameState.gameStarted && (
            <div className="absolute inset-0 flex items-center justify-center bg-black rounded">
              <div className="text-center text-white">
                <h2 className="mb-6 text-4xl font-bold">Select Starting Weapon</h2>
                <div className="grid grid-cols-3 gap-4">
                  {Object.keys(weapons).map(weaponName => (
                    <button
                      key={weaponName}
                      onClick={() => {
                        setPlayerWeapons([{ name: weaponName, level: 1 }]);
                        setGameState(prev => ({ ...prev, gameStarted: true }));
                      }}
                      className="p-4 bg-gray-800 border-2 border-gray-600 rounded hover:bg-gray-700 hover:border-orange-500"
                    >
                      <div className="mb-2 text-xl font-bold">{weaponName}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {gameState.shopOpen && (
            <div className="absolute inset-0 flex items-center justify-center bg-black rounded bg-opacity-90">
              <div className="max-w-2xl text-center text-white">
                <h2 className="mb-2 text-3xl font-bold">Shop - Wave {gameState.wave}</h2>
                <p className="mb-4 text-xl text-yellow-400">Gold: 💰{gameState.gold}</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {currentShopItems.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => buyItem(item)}
                      disabled={gameState.gold < item.cost || (item.stat === 'ability' && abilities[item.ability]?.unlocked)}
                      className={`p-3 rounded text-left ${gameState.gold >= item.cost && !(item.stat === 'ability' && abilities[item.ability]?.unlocked)
                        ? 'bg-green-700 hover:bg-green-600'
                        : 'bg-gray-700 opacity-50 cursor-not-allowed'
                        } ${item.stat === 'weapon' ? 'border-2 border-orange-500' : ''} ${item.stat === 'ability' ? 'border-2 border-cyan-500' : ''}`}
                    >
                      <div className="font-bold">{item.name}</div>
                      <div className="text-sm">{item.desc}</div>
                      <div className="mt-1 text-sm text-yellow-400">💰{item.cost}</div>
                    </button>
                  ))}
                </div>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={rerollShop}
                    disabled={gameState.gold < gameState.rerollCost}
                    className="px-6 py-3 text-lg font-bold text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-500"
                  >
                    Reroll ({gameState.rerollCost}G)
                  </button>
                  <button
                    onClick={closeShop}
                    className="px-8 py-3 text-lg font-bold text-white bg-orange-600 rounded hover:bg-orange-700"
                  >
                    Start Wave {gameState.wave}
                  </button>
                </div>
              </div>
            </div>
          )}

          {gameState.gameOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 rounded">
              <div className="text-center text-white">
                <h2 className="mb-4 text-4xl font-bold">Game Over!</h2>
                <p className="mb-2 text-xl">Wave Reached: {gameState.wave}</p>
                <p className="mb-2 text-xl">XP Earned: {gameState.xp}</p>
                <p className="mb-6 text-xl">Gold Collected: 💰{gameState.gold}</p>
                <button
                  onClick={restartGame}
                  className="px-6 py-3 text-lg font-bold text-white bg-orange-600 rounded hover:bg-orange-700"
                >
                  Restart
                </button>
              </div>
            </div>
          )}

          {gameState.paused && !gameState.shopOpen && !gameState.gameOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded">
              <div className="text-center text-white">
                <h2 className="mb-4 text-4xl font-bold">PAUSED</h2>
                <p className="text-xl">Press ESC to Resume</p>
                <button
                  onClick={restartGame}
                  className="px-6 py-3 mt-4 text-lg font-bold text-white bg-red-600 rounded hover:bg-red-700"
                >
                  Restart Game
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="max-w-2xl px-6 py-3 mt-4 text-center text-white bg-gray-800 rounded">
          <p className="mb-1 font-bold">Controls: WASD or Arrow Keys | Auto-shoots at nearest enemy | Shift to Dash</p>
          <p className="text-sm text-gray-300">Survive waves, collect gold, upgrade between waves!</p>
        </div>
      </div>
    </div>
  );
};

export default BrotatoGame;