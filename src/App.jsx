import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { HiCake, HiLockClosed } from 'react-icons/hi'
import { BsHourglassSplit, BsArrowDown, BsChevronUp, BsChevronDown } from 'react-icons/bs'
import { logger } from './utils/logger'
import './App.css'

// Function to wrap English characters with font class
const wrapEnglishText = (text) => {
  if (!text) return text
  // Match English letters, numbers, and common punctuation
  const englishRegex = /([A-Za-z0-9\s!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+)/g
  const parts = text.split(englishRegex)
  
  return parts.map((part, index) => {
    if (englishRegex.test(part)) {
      return <span key={index} className="font-nurse-holiday">{part}</span>
    }
    return part
  })
}

function App() {
  const [confetti, setConfetti] = useState([])
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [code, setCode] = useState('')
  const [isCodeCorrect, setIsCodeCorrect] = useState(false)
  const [codeError, setCodeError] = useState('')
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const [currentChapter, setCurrentChapter] = useState(0)
  const [currentPageIndex, setCurrentPageIndex] = useState(1) // หน้าเริ่มต้น = 1 (การ์ด 1 ด้านหน้า)
  const [audioRef, setAudioRef] = useState(null)
  const [showMemePopup, setShowMemePopup] = useState(null) // null, 'meme1', 'meme2', 'meme3'

  const correctCode = '1437'  // เปลี่ยนเป็น '998559' สำหรับ 6 หลัก
  const PIN_LENGTH = 4  // เปลี่ยนเป็น 6 สำหรับ 6 หลัก
  const MAX_ATTEMPTS = 5  // จำนวนครั้งสูงสุดที่สามารถลองได้

  // วันที่ 10 มกราคม 2569 (2026) เวลา 00:00:00
  const targetDate = new Date('2026-01-09T00:00:00+07:00')

  useEffect(() => {
    const checkDate = () => {
      try {
        const now = new Date()
        const difference = targetDate.getTime() - now.getTime()

        if (difference <= 0) {
          // ถ้าถึงวันที่แล้ว
          setIsUnlocked(true)
          return
        }

        // คำนวณเวลาที่เหลือ
        const days = Math.floor(difference / (1000 * 60 * 60 * 24))
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((difference % (1000 * 60)) / 1000)

        setTimeLeft({ days, hours, minutes, seconds })
      } catch (error) {
        logger.error('Error in checkDate:', error)
      }
    }

    // รันทันที
    checkDate()
    // รันทุกวินาที
    const interval = setInterval(checkDate, 1000)

    return () => clearInterval(interval)
  }, [targetDate])

  useEffect(() => {
    if (isUnlocked && isCodeCorrect) {
      // สร้าง confetti - ปรับให้เหมาะกับหน้าจอแคบ
      const confettiArray = []
      for (let i = 0; i < 40; i++) {
        confettiArray.push({
          id: i,
          left: Math.random() * 100,
          delay: Math.random() * 2,
          duration: 2 + Math.random() * 3,
        })
      }
      setConfetti(confettiArray)
      
      // เริ่มเล่นเพลงอัตโนมัติเมื่อเข้าหน้าหลัก
      if (audioRef) {
        // ตรวจสอบว่า loop เปิดอยู่
        audioRef.loop = true
        audioRef.play().catch(() => {})
        
        // ตรวจสอบอย่างต่อเนื่องว่าเพลงยังเล่นอยู่หรือไม่
        const playCheckInterval = setInterval(() => {
          if (audioRef && audioRef.loop && audioRef.paused && !audioRef.ended) {
            audioRef.play().catch(() => {})
          }
          // ตรวจสอบว่าเพลงใกล้จบแล้ว (เหลือ 0.1 วินาที) เพื่อเล่นต่อทันที
          if (audioRef && audioRef.duration && audioRef.currentTime >= audioRef.duration - 0.1) {
            audioRef.currentTime = 0
            audioRef.play().catch(() => {})
          }
        }, 100) // ลด interval เป็น 100 ms เพื่อตรวจสอบบ่อยขึ้น
        
        return () => {
          clearInterval(playCheckInterval)
        }
      }
    }
  }, [isUnlocked, isCodeCorrect, audioRef])


  // ปิดการ scroll/swipe - ใช้ปุ่มเท่านั้น (ยกเว้น Chapter 2)
  useEffect(() => {
    if (isUnlocked && isCodeCorrect) {
      let touchStartX = 0
      let touchStartY = 0

      const handleWheel = (e) => {
        // ถ้าอยู่ Chapter 2 ให้ scroll แนวตั้งได้ แต่ปิดแนวนอน
        if (currentChapter === 2) {
          // ป้องกันการเลื่อนแนวนอน
          if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
            e.preventDefault()
            e.stopPropagation()
          }
          return
        }
        // ถ้าไม่ใช่ Chapter 2 ให้ปิดการ scroll
        e.preventDefault()
        e.stopPropagation()
      }

      const handleTouchStart = (e) => {
        // ถ้าอยู่ Chapter 2 ให้เก็บตำแหน่งเริ่มต้น
        if (currentChapter === 2) {
          touchStartX = e.touches[0].clientX
          touchStartY = e.touches[0].clientY
          return
        }
        // ถ้าไม่ใช่ Chapter 2 ให้ปิดการ scroll
        if (e.touches.length > 1) {
          e.preventDefault()
        }
      }

      const handleTouchMove = (e) => {
        // ถ้าอยู่ Chapter 2 ให้ตรวจสอบทิศทาง
        if (currentChapter === 2) {
          const touchX = e.touches[0].clientX
          const touchY = e.touches[0].clientY
          const deltaX = Math.abs(touchX - touchStartX)
          const deltaY = Math.abs(touchY - touchStartY)
          
          // ถ้าเลื่อนแนวนอนมากกว่าแนวตั้ง ให้ป้องกัน
          if (deltaX > deltaY && deltaX > 10) {
            e.preventDefault()
            e.stopPropagation()
          }
          return
        }
        // ถ้าไม่ใช่ Chapter 2 ให้ปิดการ scroll
        e.preventDefault()
      }

      window.addEventListener('wheel', handleWheel, { passive: false })
      window.addEventListener('touchstart', handleTouchStart, { passive: false })
      window.addEventListener('touchmove', handleTouchMove, { passive: false })

      return () => {
        window.removeEventListener('wheel', handleWheel)
        window.removeEventListener('touchstart', handleTouchStart)
        window.removeEventListener('touchmove', handleTouchMove)
      }
    }
  }, [isUnlocked, isCodeCorrect, currentChapter])

  // Scroll to chapter when currentChapter changes
  useEffect(() => {
    if (isUnlocked && isCodeCorrect) {
      const chapterElement = document.getElementById(`chapter-${currentChapter}`)
      if (chapterElement) {
        chapterElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      // Reset page index เมื่อเปลี่ยน Chapter (ยกเว้น Chapter 1)
      if (currentChapter !== 1) {
        setCurrentPageIndex(1)
      }
    }
  }, [currentChapter, isUnlocked, isCodeCorrect])

  const handlePinClick = (num) => {
    // ถ้าถูกล็อกแล้ว ไม่ให้กดได้
    if (isLocked) return
    
    if (code.length < PIN_LENGTH) {
      const newCode = code + num
      setCode(newCode)
      setCodeError('')
      
      // ตรวจสอบ PIN อัตโนมัติเมื่อครบจำนวนหลัก
      if (newCode.length === PIN_LENGTH) {
        setTimeout(() => {
          if (newCode === correctCode) {
            // ใส่ถูก - reset ทุกอย่าง
            setIsCodeCorrect(true)
            setCodeError('')
            setFailedAttempts(0)
            setIsLocked(false)
          } else {
            // ใส่ผิด - เพิ่มจำนวนครั้งที่ผิด
            const newFailedAttempts = failedAttempts + 1
            setFailedAttempts(newFailedAttempts)
            
            // ถ้าเกินจำนวนครั้งที่กำหนด
            if (newFailedAttempts >= MAX_ATTEMPTS) {
              setIsLocked(true)
              setCodeError('นั่นแน่ใครอะะ')
              setCode('')
            } else {
              setCodeError(`รหัสไม่ถูกต้อง (เหลือ ${MAX_ATTEMPTS - newFailedAttempts} ครั้ง)`)
              setTimeout(() => {
                setCode('')
                setCodeError('')
              }, 1500)
            }
          }
        }, 300)
      }
    }
  }

  const handleDelete = () => {
    if (isLocked) return
    setCode(code.slice(0, -1))
    setCodeError('')
  }

  const handleClear = () => {
    if (isLocked) return
    setCode('')
    setCodeError('')
  }

  // ถ้ายังไม่ถึงวันที่ ให้แสดง countdown modal
  if (!isUnlocked) {
    return (
      <div 
        className="h-screen w-screen flex items-center justify-center overflow-hidden relative fixed inset-0"
        style={{
          background: 'linear-gradient(to bottom right, #E6D1F2, #D9C4EC, #CCB7E5, #BEA9DF, #B19CD8)'
        }}
      >
        <motion.div
          className="bg-white/95 backdrop-blur-md rounded-3xl p-8 mx-4 max-w-[340px] w-full shadow-2xl border-2"
          style={{ borderColor: '#B19CD8' }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', duration: 0.6 }}
        >
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#9379C2' }}>
              ยังไม่ถึงเวลางับบ
            </h2>
            <p className="text-sm" style={{ color: '#9379C2' }}>
              รอจนกว่าจะถึงวันที่ 10 มกราคม 2026 น้าาาา
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-6">
            <div
              className="rounded-xl p-3 text-center"
              style={{ background: 'linear-gradient(to bottom right, #9379C2, #B19CD7)' }}
            >
              <div className="text-2xl font-bold text-white">{String(timeLeft.days).padStart(2, '0')}</div>
              <div className="text-xs text-white/90 mt-1">วัน</div>
            </div>
            <div
              className="rounded-xl p-3 text-center"
              style={{ background: 'linear-gradient(to bottom right, #B19CD7, #C0AFE2)' }}
            >
              <div className="text-2xl font-bold text-white">{String(timeLeft.hours).padStart(2, '0')}</div>
              <div className="text-xs text-white/90 mt-1">ชั่วโมง</div>
            </div>
            <div
              className="rounded-xl p-3 text-center"
              style={{ background: 'linear-gradient(to bottom right, #C0AFE2, #CEC2EB)' }}
            >
              <div className="text-2xl font-bold text-white">{String(timeLeft.minutes).padStart(2, '0')}</div>
              <div className="text-xs text-white/90 mt-1">นาที</div>
            </div>
            <div
              className="rounded-xl p-3 text-center"
              style={{ background: 'linear-gradient(to bottom right, #CEC2EB, #DDD5F3)' }}
            >
              <div className="text-2xl font-bold text-white">{String(timeLeft.seconds).padStart(2, '0')}</div>
              <div className="text-xs text-white/90 mt-1">วินาที</div>
            </div>
          </div>

          <div
            className="text-center text-sm flex items-center justify-center gap-2"
            style={{ color: '#9379C2' }}
          >
            <span>รอสักครู่...</span>
          </div>
        </motion.div>
      </div>
    )
  }

  // ถ้าถึงวันที่แล้ว แต่ยังไม่ได้กรอกรหัส ให้แสดง modal กรอกรหัส
  if (isUnlocked && !isCodeCorrect) {
    return (
      <div 
        className="h-screen w-screen flex items-center justify-center overflow-hidden relative fixed inset-0"
        style={{
          background: 'linear-gradient(to bottom right, #E6D1F2, #D9C4EC, #CCB7E5, #BEA9DF, #B19CD8)'
        }}
      >
        <motion.div
          className="bg-white/95 backdrop-blur-md rounded-3xl p-8 mx-4 max-w-[340px] w-full shadow-2xl border-2"
          style={{ borderColor: '#B19CD8' }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', duration: 0.6 }}
        >
          <motion.div
            className="text-center mb-6"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <motion.div 
              className="mb-4 flex justify-center text-6xl"
            >
              🔒
            </motion.div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#9379C2' }}>
              ใช่แพรวามั้ยน้าาา 💜
            </h2>
            <p className="text-sm" style={{ color: '#9379C2' }}>
              กรุณากรอกรหัสเพื่อเข้า ✨
            </p>
          </motion.div>

          <div>
            {/* PIN Display */}
            <div className="mb-6">
              <div className="flex justify-center gap-3 mb-4">
                {Array.from({ length: PIN_LENGTH }).map((_, index) => (
                  <motion.div
                    key={index}
                    className="rounded-full border-2 flex items-center justify-center"
                    style={{
                      width: '36px',
                      height: '36px',
                      minWidth: '36px',
                      minHeight: '36px',
                      borderColor: codeError ? '#ef4444' : '#B19CD8',
                      backgroundColor: index < code.length ? '#9379C2' : 'transparent',
                      color: index < code.length ? 'white' : '#9379C2'
                    }}
                    animate={{
                      scale: index < code.length ? [1, 1.1, 1] : 1
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    {index < code.length && (
                      <motion.div
                        className="rounded-full"
                        style={{ 
                          width: '12px',
                          height: '12px',
                          backgroundColor: index < code.length ? 'white' : 'transparent' 
                        }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.2 }}
                      />
                    )}
                  </motion.div>
                ))}
              </div>
              {codeError && (
                <motion.p
                  className="text-sm text-center font-bold"
                  style={{ color: isLocked ? '#9379C2' : '#ef4444' }}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {isLocked ? '😏 ' : '❌ '}{codeError}
                </motion.p>
              )}
            </div>

            {/* PIN Pad */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <motion.button
                  key={num}
                  type="button"
                  onClick={() => handlePinClick(num.toString())}
                  className="py-4 rounded-xl font-bold text-xl text-white"
                  style={{
                    background: isLocked 
                      ? 'linear-gradient(to bottom right, #C0AFE2, #CEC2EB)' 
                      : 'linear-gradient(to bottom right, #9379C2, #B19CD7)',
                    opacity: isLocked ? 0.5 : 1,
                    cursor: isLocked ? 'not-allowed' : 'pointer'
                  }}
                  whileHover={isLocked ? {} : { scale: 1.05 }}
                  whileTap={isLocked ? {} : { scale: 0.95 }}
                  disabled={code.length >= PIN_LENGTH || isLocked}
                >
                  {num}
                </motion.button>
              ))}
              <motion.button
                type="button"
                onClick={handleClear}
                className="py-4 rounded-xl font-bold text-sm text-white"
                style={{
                  background: 'linear-gradient(to bottom right, #C0AFE2, #CEC2EB)',
                  opacity: isLocked ? 0.5 : 1,
                  cursor: isLocked ? 'not-allowed' : 'pointer'
                }}
                whileHover={isLocked ? {} : { scale: 1.05 }}
                whileTap={isLocked ? {} : { scale: 0.95 }}
                disabled={isLocked}
              >
                ล้าง
              </motion.button>
              <motion.button
                type="button"
                onClick={() => handlePinClick('0')}
                className="py-4 rounded-xl font-bold text-xl text-white"
                style={{
                  background: isLocked 
                    ? 'linear-gradient(to bottom right, #C0AFE2, #CEC2EB)' 
                    : 'linear-gradient(to bottom right, #9379C2, #B19CD7)',
                  opacity: isLocked ? 0.5 : 1,
                  cursor: isLocked ? 'not-allowed' : 'pointer'
                }}
                whileHover={isLocked ? {} : { scale: 1.05 }}
                whileTap={isLocked ? {} : { scale: 0.95 }}
                disabled={code.length >= PIN_LENGTH || isLocked}
              >
                0
              </motion.button>
              <motion.button
                type="button"
                onClick={handleDelete}
                className="py-4 rounded-xl font-bold text-sm text-white"
                style={{
                  background: 'linear-gradient(to bottom right, #C0AFE2, #CEC2EB)',
                  opacity: isLocked ? 0.5 : 1,
                  cursor: isLocked ? 'not-allowed' : 'pointer'
                }}
                whileHover={isLocked ? {} : { scale: 1.05 }}
                whileTap={isLocked ? {} : { scale: 0.95 }}
                disabled={code.length === 0 || isLocked}
              >
                ลบ
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  // ถ้าถึงวันที่แล้ว และกรอกรหัสถูกต้อง ให้แสดงเนื้อหาหลัก
  return (
    <div 
      className="h-screen w-screen overflow-hidden relative"
      style={{
        background: 'linear-gradient(to bottom, #E6D1F2, #D9C4EC, #CCB7E5, #BEA9DF, #B19CD8, #9379C2)',
        touchAction: 'none',
        maxWidth: '100vw'
      }}
    >
      {/* Audio Player */}
      {isUnlocked && isCodeCorrect && (
        <>
          <audio
            ref={(el) => {
              if (el && !audioRef) {
                setAudioRef(el)
                el.loop = true
                el.volume = 0.5  // ปรับเป็น 0.1, 0.15, 0.2, 0.3 ตามต้องการ (0.0-1.0)
                
                // ตรวจสอบเมื่อเพลงใกล้จบ (เหลือ 0.1 วินาที) เพื่อเล่นต่อทันที
                const handleTimeUpdate = () => {
                  if (el.duration && el.currentTime >= el.duration - 0.1) {
                    el.currentTime = 0
                    el.play().catch(() => {})
                  }
                }
                el.addEventListener('timeupdate', handleTimeUpdate)
                
                // ตรวจสอบ loop อีกครั้งเมื่อเพลงจบ
                const handleEnded = () => {
                  el.currentTime = 0
                  el.play().catch(() => {})
                }
                el.addEventListener('ended', handleEnded)
                
                // เมื่อ seek เสร็จแล้วให้เล่นต่อทันที
                const handleSeeked = () => {
                  if (el.loop && el.paused) {
                    el.play().catch(() => {})
                  }
                }
                el.addEventListener('seeked', handleSeeked)
                
                // ตรวจสอบเมื่อเกิด error
                const handleError = () => {
                  logger.error('Audio error occurred, attempting to reload')
                  el.load()
                  setTimeout(() => {
                    el.play().catch(() => {})
                  }, 50)
                }
                el.addEventListener('error', handleError)
                
                // ตรวจสอบอย่างต่อเนื่องว่าเพลงยังเล่นอยู่หรือไม่
                const checkInterval = setInterval(() => {
                  if (el && el.loop && el.paused && !el.ended) {
                    el.play().catch(() => {})
                  }
                }, 200)
                
                // เก็บ references สำหรับ cleanup
                el._checkInterval = checkInterval
                el._eventHandlers = { handleTimeUpdate, handleEnded, handleSeeked, handleError }
                
                // Cleanup function
                return () => {
                  if (el._checkInterval) {
                    clearInterval(el._checkInterval)
                  }
                  if (el._eventHandlers) {
                    el.removeEventListener('timeupdate', el._eventHandlers.handleTimeUpdate)
                    el.removeEventListener('ended', el._eventHandlers.handleEnded)
                    el.removeEventListener('seeked', el._eventHandlers.handleSeeked)
                    el.removeEventListener('error', el._eventHandlers.handleError)
                  }
                }
              }
            }}
            src="/song.m4a"
            loop
            onError={() => {
              logger.error('Audio error occurred')
            }}
            onLoadedData={() => {
              if (audioRef) {
                audioRef.play().catch(() => {})
              }
            }}
            onTimeUpdate={() => {
              // ตรวจสอบว่าเพลงยังเล่นอยู่หรือไม่
              if (audioRef && audioRef.paused && audioRef.loop && !audioRef.ended) {
                audioRef.play().catch(() => {})
              }
            }}
          />
          {/* Page Navigation Buttons */}
          <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            {/* ปุ่มขึ้น - แสดงเฉพาะหน้ากลางและหน้าสุดท้าย */}
            {currentChapter > 0 && (
              <motion.button
                onClick={() => {
                  // เปลี่ยน Chapter เท่านั้น ไม่มีผลกับ currentPageIndex
                  setCurrentChapter(prev => prev - 1)
                }}
                className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
                style={{
                  background: 'linear-gradient(to bottom right, #9379C2, #B19CD7)',
                  color: 'white'
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 }}
              >
                <BsChevronUp size={20} />
              </motion.button>
            )}
            {/* ปุ่มลง - แสดงเฉพาะหน้าแรกและหน้ากลาง */}
            {currentChapter < 2 && (
              <motion.button
                onClick={() => {
                  // เปลี่ยน Chapter เท่านั้น ไม่มีผลกับ currentPageIndex
                  setCurrentChapter(prev => prev + 1)
                }}
                className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
                style={{
                  background: 'linear-gradient(to bottom right, #9379C2, #B19CD7)',
                  color: 'white'
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.1 }}
              >
                <BsChevronDown size={20} />
              </motion.button>
            )}
          </div>
        </>
      )}
      {/* Confetti */}
      {confetti.map((item) => (
        <motion.div
          key={item.id}
          className="fixed w-3 h-3 rounded-full pointer-events-none z-50"
          style={{
            left: `${item.left}%`,
            top: '-10px',
            backgroundColor: ['#B19CD8', '#BEA9DF', '#CCB7E5', '#D9C4EC', '#E6D1F2', '#9379C2', '#B19CD7', '#C0AFE2', '#CEC2EB', '#DDD5F3'][
              Math.floor(Math.random() * 10)
            ],
          }}
          initial={{ y: 0, opacity: 1 }}
          animate={{
            y: typeof window !== 'undefined' ? window.innerHeight + 100 : 1000,
            opacity: [1, 1, 0],
            rotate: 360,
          }}
          transition={{
            duration: item.duration,
            delay: item.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}

      {/* Chapter Indicator */}
      <div className="fixed top-4 right-4 z-40 flex flex-col gap-2">
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            className={`w-3 h-3 rounded-full border-2 ${
              currentChapter === index ? 'bg-white' : 'bg-transparent'
            }`}
            style={{ borderColor: '#9379C2' }}
            animate={{
              scale: currentChapter === index ? [1, 1.2, 1] : 1
            }}
            transition={{ duration: 0.3 }}
          />
        ))}
      </div>

      {/* Chapter 1 */}
      <section
        id="chapter-0"
        className="h-screen w-screen flex items-center justify-center px-6 relative"
        style={{ scrollSnapAlign: 'start' }}
      >
        <motion.div
          className="text-center w-full max-w-[360px] mx-auto"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', duration: 0.8 }}
        >
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: 'reverse',
            }}
            className="mb-4 flex justify-center"
            style={{ color: '#9379C2' }}
          >
            <HiCake size={80} />
          </motion.div>

          <motion.h1
            className="text-4xl font-bold mb-4 drop-shadow-2xl leading-relaxed"
            style={{ 
              color: '#6B4C93',
              letterSpacing: '0.5px',
              lineHeight: '1.4',
              textShadow: '0 2px 8px rgba(255, 255, 255, 0.8), 0 1px 3px rgba(107, 76, 147, 0.3)'
            }}
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {wrapEnglishText('สุขสันต์วันเกิดนะแก')}
          </motion.h1>

          <motion.p
            className="text-xl mb-8 drop-shadow-lg px-2 leading-relaxed"
            style={{ 
              color: '#6B4C93',
              letterSpacing: '0.3px',
              lineHeight: '1.6',
              textShadow: '0 2px 6px rgba(255, 255, 255, 0.8), 0 1px 2px rgba(107, 76, 147, 0.3)'
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            ฉันขอให้แกมีความสุขมากๆ น้าาาาา
          </motion.p>

          {/* Scroll Down Arrow */}
          <motion.div
            className="mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              className="flex flex-col items-center gap-2 cursor-pointer"
              onClick={() => {
                setCurrentChapter(1)
                const chapterElement = document.getElementById('chapter-1')
                if (chapterElement) {
                  chapterElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              }}
            >
              <BsArrowDown 
                size={28} 
                style={{ 
                  color: '#6B4C93',
                  filter: 'drop-shadow(0 2px 4px rgba(255, 255, 255, 0.6))'
                }}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* Chapter 2 - Card Stack */}
      <section
        id="chapter-1"
        className="h-screen w-screen flex flex-col items-center justify-center px-4 relative"
        style={{ scrollSnapAlign: 'start' }}
      >
        <motion.h2
          className="text-3xl font-bold mb-4 text-center drop-shadow-2xl font-nurse-holiday w-full"
          style={{ color: '#9379C2', marginTop: '-80px' }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {wrapEnglishText('กดกดดด')} 💜
        </motion.h2>
        
        <div className="w-full max-w-[340px] h-[500px] relative">

          {(() => {
            const cards = [
              { 
                src: '/pic/img11.JPG', 
                alt: 'Memory 1', 
                id: 'card1',
                message: 'ขอให้แกมีความสุขมากมากน้าาา\n' // ใส่ข้อความที่นี่
              },
              { 
                src: '/pic/img2.JPG', 
                alt: 'Memory 2', 
                id: 'card2',
                message: 'ขอให้แกมีสุขภาพร่างกายแข็งแรงง\nได้พักผ่อนเยอะเยอะะะ\nนอนอย่างเต็มอิ่มม' // ใส่ข้อความที่นี่
              },
              { 
                src: '/pic/img8.JPG', 
                alt: 'Memory 3', 
                id: 'card3',
                message: 'ขอให้แกได้กินของอร่อยอร่อยทุกวันนน\nได้กินสิ่งที่อยากกินนน' // ใส่ข้อความที่นี่ร่าง
              },
              { 
                src: '/pic/img4.jpg', 
                alt: 'Memory 4', 
                id: 'card4',
                message: 'สิ่งที่แกคิด\nฉันขอให้มันเป็นดั่งใจแกเสมอออ\nและสอบผ่านในทุกทุกวิชาา\nสู้ๆน้าาาาาา' // ใส่ข้อความที่นี
              },
              { 
                src: '/pic/img5.jpg', 
                alt: 'Memory 5', 
                id: 'card5',
                message: 'มีความสุขกับสิ่งที่ตัวเองทำน้าาา\nแกเก่งมากมากเลยยย\nขอให้เป็นอายุ22ที่แกมีความสุขไปทั้งปีเลยยยยย\nเจอแต่คนน่ารักกก' // ใส่ข้อความที่นี่
              }
            ]
            const totalPages = cards.length * 2 // จำนวนหน้าทั้งหมด (แต่ละการ์ดมี 2 หน้า)
            
            return cards.map((img, index) => {
              // คำนวณหน้า: แต่ละการ์ดมี 2 หน้า (หน้าแรก = ด้านหน้า, หน้าสุดท้าย = ด้านหลัง)
              // การ์ด 1 = หน้า 1-2, การ์ด 2 = หน้า 3-4, การ์ด 3 = หน้า 5-6, ...
              const cardPageStart = (index * 2) + 1 // หน้าแรกของการ์ดนี้
              const cardPageEnd = (index * 2) + 2 // หน้าสุดท้ายของการ์ดนี้
              const currentCardIndex = Math.floor((currentPageIndex - 1) / 2) // การ์ดที่กำลังแสดง (0-based)
              const isActive = index === currentCardIndex // แสดงการ์ดที่ตรงกับหน้า
              const isFlipped = currentPageIndex === cardPageEnd // หน้าคู่ = ด้านหลัง
              const isNext = index === currentCardIndex + 1
              const isPrevious = index < currentCardIndex
              const zIndex = isActive ? 10 : isNext ? 9 : Math.max(1, 10 - index)
              const scale = isActive ? 1 : isNext ? 0.95 : 0.9
              const yOffset = (index - currentCardIndex) * 8

            return (
              <motion.div
                key={img.id}
                className="absolute w-full h-full perspective-1000"
                style={{
                  zIndex: zIndex,
                  cursor: isActive ? 'pointer' : 'default',
                  pointerEvents: isActive ? 'auto' : 'none'
                }}
                initial={{ opacity: 0, scale: 0.8, y: 50 }}
                animate={{ 
                  opacity: isActive ? 1 : isNext ? 0.8 : 0.6,
                  scale: scale,
                  y: yOffset,
                  x: isPrevious ? 500 : 0
                }}
                transition={{ 
                  delay: isActive ? 0 : 0.3,
                  duration: 0.5,
                  ease: 'easeOut'
                }}
              >
                {/* ส่วนซ้าย - กลับหน้าก่อนหน้า (อยู่นอกการ์ดที่ flip) */}
                {isActive && (
                  <div
                    className="absolute left-0 top-0 w-1/2 h-full z-20 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      // กดซ้าย = กลับหน้าก่อนหน้า (หน้า - 1)
                      if (currentPageIndex > 1) {
                        setCurrentPageIndex(prev => prev - 1)
                      }
                    }}
                  />
                )}
                
                {/* ส่วนขวา - ไปหน้าถัดไป (อยู่นอกการ์ดที่ flip) */}
                {isActive && (
                  <div
                    className="absolute right-0 top-0 w-1/2 h-full z-20 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      // กดขวา = ไปหน้าถัดไป (หน้า + 1)
                      // คำนวณจำนวนหน้าทั้งหมดจากจำนวนการ์ด (แต่ละการ์ดมี 2 หน้า)
                      const maxPages = cards.length * 2
                      if (currentPageIndex < maxPages) {
                        setCurrentPageIndex(prev => prev + 1)
                      }
                    }}
                  />
                )}

                <motion.div
                  className="relative w-full h-full"
                  style={{ transformStyle: 'preserve-3d' }}
                  animate={{ 
                    rotateY: isFlipped ? 180 : 0
                  }}
                  transition={{ 
                    duration: 0.6, 
                    ease: 'easeInOut' 
                  }}
                  whileTap={isActive ? { scale: 0.98 } : {}}
                >
                  {/* ด้านหน้าของการ์ด - รูปภาพ */}
                  <div
                    className="absolute w-full h-full rounded-2xl shadow-2xl overflow-hidden"
                    style={{
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                      transform: 'rotateY(0deg)',
                    }}
                  >
                    <img
                      src={img.src}
                      alt={img.alt}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {/* Animation กลมๆ จางๆ บ่งบอกให้กดขวาล่าง - แสดงเฉพาะการ์ดแรกที่ยังไม่ flip */}
                    {isActive && !isFlipped && index === 0 && (
                      <motion.div
                        className="absolute bottom-4 right-4 w-16 h-16 rounded-full pointer-events-none"
                        style={{
                          background: 'rgba(255, 255, 255, 0.3)',
                          backdropFilter: 'blur(4px)',
                          WebkitBackdropFilter: 'blur(4px)',
                        }}
                        animate={{
                          scale: [1, 1.3, 1],
                          opacity: [0.3, 0.6, 0.3],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'easeInOut'
                        }}
                      >
                        <motion.div
                          className="absolute inset-0 rounded-full"
                          style={{
                            border: '2px solid rgba(255, 255, 255, 0.5)',
                          }}
                          animate={{
                            scale: [1, 1.5, 1],
                            opacity: [0.5, 0, 0.5],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: 'easeInOut'
                          }}
                        />
                      </motion.div>
                    )}
                  </div>

                  {/* ด้านหลังของการ์ด - ข้อความ */}
                  <div
                    className="absolute w-full h-full rounded-2xl shadow-2xl overflow-hidden"
                    style={{
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                    }}
                  >
                    <div className="w-full h-full bg-gradient-to-br from-pink-200 via-purple-200 to-pink-300 p-6 flex items-center justify-center relative">
                      <motion.div
                        className="text-center w-full"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        <motion.p
                          className="text-lg leading-relaxed mb-4 whitespace-pre-wrap"
                          style={{ 
                            color: '#9379C2',
                            letterSpacing: '0.3px',
                            lineHeight: '1.8'
                          }}
                        >
                          {img.message || 'ข้อความสำหรับการ์ดนี้'}
                        </motion.p>
                      </motion.div>
                      {/* Animation กลมๆ จางๆ บ่งบอกให้กดซ้ายล่าง - แสดงเฉพาะการ์ดสุดท้ายที่กลับหลังแล้ว */}
                      {isActive && isFlipped && index === cards.length - 1 && (
                        <motion.div
                          className="absolute bottom-4 left-4 w-16 h-16 rounded-full pointer-events-none"
                          style={{
                            background: 'rgba(255, 255, 255, 0.3)',
                            backdropFilter: 'blur(4px)',
                            WebkitBackdropFilter: 'blur(4px)',
                          }}
                          animate={{
                            scale: [1, 1.3, 1],
                            opacity: [0.3, 0.6, 0.3],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: 'easeInOut'
                          }}
                        >
                          <motion.div
                            className="absolute inset-0 rounded-full"
                            style={{
                              border: '2px solid rgba(255, 255, 255, 0.5)',
                            }}
                            animate={{
                              scale: [1, 1.5, 1],
                              opacity: [0.5, 0, 0.5],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: 'easeInOut'
                            }}
                          />
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )
          })
          })()}
        </div>
      </section>

      {/* Chapter 3 - Gallery 2 */}
      <section
        id="chapter-2"
        className="h-screen w-screen overflow-y-auto overflow-x-hidden py-8"
        style={{ 
          scrollSnapAlign: 'start',
          touchAction: 'pan-y',
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorX: 'none',
          overscrollBehaviorY: 'auto'
        }}
      >
        <div className="max-w-[360px] mx-auto px-4">
          <motion.h2
            className="text-3xl font-bold mb-6 text-center drop-shadow-2xl font-nurse-holiday"
            style={{ color: '#9379C2' }}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {wrapEnglishText('PRAEWA DAY')} ✨
          </motion.h2>
          
          <div className="space-y-4 mb-6">
            {[
              { src: '/pic/img11.JPG', alt: 'Memory 1' },
              { src: '/pic/img10.JPG', alt: 'Memory 2' },
              { src: '/pic/img9.JPG', alt: 'Memory 3' },
              { src: '/pic/img5.jpg', alt: 'Memory 4' },
              { src: '/pic/img1.JPG', alt: 'Memory 5' },
              { src: '/pic/img6.jpg', alt: 'Memory 6' },
              { src: '/pic/img7.jpg', alt: 'Memory 7' },
              { src: '/pic/img8.JPG', alt: 'Memory 8' },
              { src: '/pic/img4.jpg', alt: 'Memory 9' },
              { src: '/pic/img12.jpg', alt: 'Memory 10' },
              { src: '/pic/img2.JPG', alt: 'Memory 11' },

            ].map((img, index, array) => {
              const isLast = index === array.length - 1
              const isThirdImage = index === 2 // รูปที่ 3 (index 2)
              const isFifthImage = index === 4 // รูปที่ 5 (index 4)
              const isEighthImage = index === 8 // รูปที่ 8 (index 7)
              return (
                <motion.div
                  key={index}
                  className="relative"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15, duration: 0.5 }}
                  onViewportEnter={() => {
                    // เมื่อรูปที่ 3, 5, หรือ 8 เข้ามาใน viewport ให้แสดง pop up
                    if (isThirdImage) {
                      setShowMemePopup('meme1')
                      // ซ่อน pop up หลังจาก 3 วินาที
                      setTimeout(() => {
                        setShowMemePopup(null)
                      }, 3000)
                    } else if (isFifthImage) {
                      setShowMemePopup('meme2')
                      // ซ่อน pop up หลังจาก 3 วินาที
                      setTimeout(() => {
                        setShowMemePopup(null)
                      }, 3000)
                    } else if (isEighthImage) {
                      setShowMemePopup('meme3')
                      // ซ่อน pop up หลังจาก 3 วินาที
                      setTimeout(() => {
                        setShowMemePopup(null)
                      }, 3000)
                    }
                  }}
                >
                  <motion.div
                    className="relative overflow-hidden rounded-2xl shadow-lg"
                    whileHover={{ scale: 1.02 }}
                  >
                    <img
                      src={img.src}
                      alt={img.alt}
                      className="w-full h-auto object-cover"
                      loading="lazy"
                    />
                  </motion.div>
                </motion.div>
              )
            })}
          </div>
          
          {/* กรอบขาวๆ ต่อออกมาจากรูปสุดท้าย สำหรับใส่ข้อความ */}
          <motion.div
            className="bg-white rounded-2xl shadow-lg p-6 mt-4"
            style={{
              maxWidth: 'calc(100% + 4rem)',
              width: '100%',
              marginLeft: 'auto',
              marginRight: 'auto'
            }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <motion.p
              className="text-lg leading-relaxed whitespace-pre-wrap text-center"
              style={{ 
                color: '#9379C2',
                letterSpacing: '0.3px',
                lineHeight: '1.8'
              }}
            >
              {`สิ่งที่แกทำ ฉันจะอยู่\nซัพพอร์ตแกไปตลอดน้าาาา\nจะอยู่สปอยแกแบบนี้ไปตลอดแหละ😆\nอยากกินอะไรก็บอกน้าาา\nอยากไปไหนก็บอกกก\nแบบนี้มีแกคนเดียวนะที่ทำให้อะอิอิ`}
            </motion.p>
          </motion.div>
          
          {/* Footer ล่องหนเพื่อให้เลื่อนได้จนเห็น content ทั้งหมด */}
          <div className="h-32 w-full" style={{ opacity: 0 }} />
        </div>
        
        {/* Pop up รูปจางๆ เมื่อเลื่อนผ่านรูปที่ 3, 5, หรือ 8 */}
        {showMemePopup && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="relative max-w-[280px] w-full mx-4"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.7 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <img
                src={
                  showMemePopup === 'meme1' ? '/pic/img_meme_1.jpeg' :
                  showMemePopup === 'meme2' ? '/pic/img_meme_2.jpeg' :
                  '/pic/img_meme_3.jpeg'
                }
                alt="Meme"
                className="w-full h-auto rounded-2xl shadow-2xl"
                style={{
                  opacity: 0.7,
                  filter: 'blur(1px)',
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </section>
    </div>
  )
}

export default App

