import { useEffect, useState } from 'react';
import styles from './ScrollMist.module.css';

export function ScrollMist() {
  const [showTop, setShowTop] = useState(false);
  const [showBottom, setShowBottom] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const scrollHeight = document.body.scrollHeight;
      const clientHeight = window.innerHeight;
      
      // Show top mist when scrolled more than 50px from top
      setShowTop(scrollTop > 50);
      
      // Show bottom mist when not at bottom (within 10px of end)
      setShowBottom(scrollTop + clientHeight < scrollHeight - 10);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {showTop && <div className={styles.mistTop} />}
      {showBottom && <div className={styles.mistBottom} />}
    </>
  );
}
