import { useEffect, useRef, useState } from 'react';
import styles from './ScrollMist.module.css';

export function ScrollMist({ containerRef }) {
  const [showBottom, setShowBottom] = useState(true);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const el = containerRef?.current || window;
    const checkScroll = () => {
      const scrollTop = el === window ? window.scrollY : el.scrollTop;
      const scrollHeight = el === window ? document.body.scrollHeight : el.scrollHeight;
      const clientHeight = el === window ? window.innerHeight : el.clientHeight;
      
      setShowTop(scrollTop > 50);
      setShowBottom(scrollTop + clientHeight < scrollHeight - 50);
    };

    el.addEventListener('scroll', checkScroll);
    checkScroll();
    return () => el.removeEventListener('scroll', checkScroll);
  }, [containerRef]);

  return (
    <>
      {showTop && <div className={styles.mistTop} />}
      {showBottom && <div className={styles.mistBottom} />}
    </>
  );
}
