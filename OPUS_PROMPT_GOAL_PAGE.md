# Build the Goal Builder Page - Complete Design Brief

You are building the main Goal Builder page that displays after onboarding completes. This is a React 19 + Vite + CSS Modules + Framer Motion project with **Apple-level polish** and a **calm luxury cinematic clean** aesthetic.

## Tech Stack
- React 19 + Vite
- CSS Modules (named exports)
- Framer Motion for all animations
- No shadcn, no Tailwind - pure CSS Modules
- Glass morphism, depth, micro-interactions, smooth spring physics

## Design Standards (CRITICAL)
- **Theme**: Calm luxury, cinematic, clean - think Apple product pages
- **Colors**:
  - Background: Deep dark (#0A0A0F, #0F0F14)
  - Glass cards: `rgba(15, 15, 20, 0.35)` with `backdrop-filter: blur(32px)`
  - Gold accent: `#C8A96E` for highlights, progress, achievements
  - Phase colors: Foundation (#3182CE blue), Acceleration (#F59E0B amber), Mastery (#9F7AEA purple)
- **Typography**: System fonts, clamp() for responsive sizing
- **Animations**: Spring physics (stiffness: 300-400, damping: 25-35), micro-interactions on hover
- **Depth**: Multi-layer shadows, inset highlights, gradient overlays
- **No generic UI**: Every element should feel premium, polished, intentional

## File Structure
```
frontend/src/pages/GoalBuilder/
├── GoalBuilder.jsx (already exists - has tabs for Overview/Daily/Progress/Settings)
├── GoalBuilder.module.css
└── components/
    └── GoalTab/
        ├── GoalTab.jsx (NEW - this is what you're building)
        └── GoalTab.module.css (NEW)
```

## Data Structure from Backend

After onboarding, the frontend receives this data structure:

```javascript
{
  goal: {
    id: 1,
    title: "Get fit and build muscle",
    description: "Lose 15 pounds, build lean muscle",
    theme: "balanced", // tactical, balanced, gentle
    duration_days: 180,
    start_date: "2026-03-18",
    current_streak: 7,
    longest_streak: 7,
    freezes_available: 2,
    is_active: true
  },

  daily_schedule: [
    {
      time: "06:00",
      activity: "Morning Routine",
      description: "Meditation + goal visualization",
      tags: ["mindfulness", "preparation"],
      sort_order: 1
    },
    {
      time: "08:00",
      activity: "Focused Work Block",
      description: "Peak productivity window",
      tags: ["focus", "priority"],
      sort_order: 2
    }
    // 15-20 total items covering full day
  ],

  phases: [
    {
      phase_number: 0,
      title: "Foundation",
      description: "Build core habits and baseline systems",
      unlock_streak_required: 0,
      is_unlocked: true,
      domains: [
        {
          name: "Physical Foundation",
          tasks: [
            {
              id: 1,
              title: "Establish morning routine",
              is_completed: false,
              subtasks: [
                "Wake at consistent time",
                "10-minute meditation",
                "Goal review and visualization"
              ]
            },
            {
              id: 2,
              title: "Build exercise habit",
              is_completed: false,
              subtasks: [
                "3x weekly gym sessions",
                "Track workouts in app",
                "Progressive overload protocol"
              ]
            }
          ]
        },
        {
          name: "Mental Foundation",
          tasks: [
            {
              id: 3,
              title: "Develop focus rituals",
              is_completed: false,
              subtasks: [
                "Forest sounds playlist",
                "Phone in another room",
                "90-minute work blocks"
              ]
            }
          ]
        }
        // 4-6 domains total
      ]
    },
    {
      phase_number: 1,
      title: "Acceleration",
      description: "Increase intensity and build momentum",
      unlock_streak_required: 14,
      is_unlocked: false, // Locked until 14-day streak
      domains: [...]
    },
    {
      phase_number: 2,
      title: "Mastery",
      description: "Peak performance and optimization",
      unlock_streak_required: 42,
      is_unlocked: false, // Locked until 42-day streak
      domains: [...]
    }
  ]
}
```

## Required Features

### 1. Hero Section (Top)
- **Goal Title** (large, gradient text with gold)
- **Streak Display**: Current streak with fire icon, animated counter
- **Progress Ring**: Circular progress showing days completed / total duration
- **Freeze Badges**: Show available streak freezes (golden shield icons)
- **Theme Badge**: Display current theme (tactical/balanced/gentle) with styled pill
- **Quick Actions**: Floating buttons for "Today's Checklist", "Weekly Review", "Adjust Plan"

### 2. Phase Timeline (Center Focus)
- **3 Phase Cards** displayed horizontally (or vertical on mobile)
- Each card shows:
  - Phase number (0, 1, 2)
  - Phase title (Foundation, Acceleration, Mastery)
  - Description
  - Unlock requirement (0/14/42 day streak)
  - Lock state visualization (locked phases have blur + lock icon overlay)
  - Progress: X/Y tasks completed in this phase
  - Phase-specific color accent (blue/amber/purple)

- **Locked State**:
  - Blur effect on card content
  - Large centered lock icon
  - Text: "Unlocks at X day streak" with countdown
  - Subtle pulse animation on lock icon

- **Unlocked State**:
  - Full clarity, no blur
  - Expandable/collapsible domains
  - Animated unlock celebration when threshold reached

### 3. Phase Expansion View
When user clicks an unlocked phase, expand to show:

**Domain Cards** (4-6 per phase):
- Domain name header with icon
- List of tasks (2-4 per domain)
- Each task:
  - Title with checkbox (can mark complete)
  - Expandable to show subtasks (3-5 per task)
  - Completion state with smooth check animation
  - Progress bar showing completed subtasks

**Task Interaction**:
- Click task to expand/collapse subtasks
- Check task to mark all subtasks complete
- Check individual subtasks
- Smooth height animations on expand/collapse
- Confetti animation on task completion (subtle, gold particles)

### 4. Daily Schedule Panel (Sidebar or Tab)
- Time-based list of daily activities (15-20 items)
- Each item shows:
  - Time (HH:MM format)
  - Activity name
  - Description
  - Tags (as styled pills)
- Current time indicator (gold line or highlight)
- Smooth scroll to current time on load
- Glass card design with hover states

### 5. Completion Tracking
- **Daily Log**: Mark today's activities as done
- **Streak Calculation**: Auto-update streak based on completion
- **Freeze Mechanic**: Button to use a freeze (with confirmation)
- **Phase Unlock Celebration**: Animated modal when hitting 14 or 42 days

### 6. Progress Visualization
- **Completion Chart**: Visual progress over time (mini chart)
- **Domain Progress**: Radial progress for each domain
- **Weekly Summary**: Completion percentage for past 7 days
- **Milestone Badges**: Unlock achievements at key streaks (7, 14, 21, 42, 90 days)

## Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│  Hero Section                                           │
│  ┌─────────┐  [Streak: 7🔥]  ┌──────────┐            │
│  │ Progress│  Freezes: ⚔️⚔️    │Theme: ⚡ │            │
│  │  Ring   │  Goal: Get Fit   │Balanced │            │
│  └─────────┘                  └──────────┘            │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Phase Timeline (Horizontal Cards)                      │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐         │
│  │ Phase 0   │  │ Phase 1   │  │ Phase 2   │         │
│  │Foundation │  │Acceleration│ │ Mastery   │         │
│  │ UNLOCKED  │  │  🔒 14d   │  │  🔒 42d   │         │
│  │ 3/12 ✓    │  │  Locked   │  │  Locked   │         │
│  └───────────┘  └───────────┘  └───────────┘         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Expanded Phase View (when phase clicked)              │
│  ┌───────────────────────────────────────────────────┐│
│  │ Physical Foundation                 [4/6 tasks ✓] ││
│  │  ☐ Establish morning routine                      ││
│  │  ☑ Build exercise habit                           ││
│  │  ☐ Optimize nutrition                             ││
│  │  ☐ Sleep schedule consistency                     ││
│  └───────────────────────────────────────────────────┘│
│  ┌───────────────────────────────────────────────────┐│
│  │ Mental Foundation                   [2/4 tasks ✓] ││
│  │  ☑ Develop focus rituals                          ││
│  │  ☐ Build reading habit                            ││
│  │  ...                                               ││
│  └───────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Daily Schedule (Right Panel or Separate Tab)          │
│  06:00 - Morning Routine                               │
│  08:00 - Focused Work Block         [mindfulness] [🔥]│
│  10:00 - Movement Break                                │
│  ...                                                    │
└─────────────────────────────────────────────────────────┘
```

## Animation Requirements

1. **Page Load**:
   - Stagger entrance: Hero → Phase cards → Schedule (50ms delays)
   - Spring physics on all entrances
   - Fade + translateY for cards

2. **Phase Card Interactions**:
   - Hover: Lift with shadow increase, subtle scale (1.02)
   - Click: Expand domains with smooth height animation
   - Lock pulse: Gentle scale pulse (0.95 → 1.05) every 2s

3. **Task Completion**:
   - Checkbox: Checkmark draw animation (stroke-dashoffset)
   - Task strikethrough: Animate line across text
   - Gold particle burst (5-10 particles, subtle)
   - Progress bar smooth fill transition

4. **Phase Unlock**:
   - Full-screen celebration modal
   - Large animated badge/medal
   - Confetti explosion (gold + phase color)
   - Sound effect trigger point (frontend plays sound)
   - Blur unlock animation (clarity fade-in)

5. **Streak Counter**:
   - Number count-up animation on load
   - Fire emoji scale pulse on increment
   - Rainbow gradient shimmer on milestone (7, 14, 21, etc.)

## Micro-Interactions

- **Hover States**: All interactive elements (buttons, cards, checkboxes) have hover states
- **Active States**: Pressed state with slight scale down (0.98)
- **Focus States**: Gold outline ring for accessibility
- **Loading States**: Skeleton loaders with shimmer for async data
- **Empty States**: Elegant message if no tasks/schedule
- **Error States**: Subtle red glow if action fails

## Responsive Design

- **Desktop (>1024px)**: Side-by-side layout (phases left, schedule right)
- **Tablet (768-1024px)**: Stacked with full-width cards
- **Mobile (<768px)**: Single column, phases as accordion

## Integration Notes

1. **State Management**: Use React useState/useEffect, fetch goal data on mount
2. **API Endpoints**:
   - `GET /api/goals/:goalId` - Fetch goal + phases + schedule
   - `PATCH /api/goals/:goalId/tasks/:taskId` - Mark task complete
   - `POST /api/goals/:goalId/daily-log` - Log daily completion
   - `POST /api/goals/:goalId/freeze` - Use streak freeze

3. **Real-time Updates**: Optimistic UI updates (mark complete immediately, sync to backend)
4. **Persistence**: Save completion state to backend on action
5. **Accessibility**: ARIA labels, keyboard navigation, focus management

## Design References

Think of these aesthetics:
- **Apple product pages**: Clean, spacious, premium
- **Linear app**: Smooth animations, keyboard shortcuts, fast interactions
- **Notion**: Expandable sections, clean hierarchy
- **Duolingo streaks**: Gamification done tastefully
- **Calm app**: Serene, luxury, not overwhelming

## File Organization

Create these files:
1. **GoalTab.jsx** - Main component
2. **GoalTab.module.css** - All styles
3. **GoalTab.constants.js** - Phase colors, animation configs (optional)

## Color Palette Reference

```css
/* Background */
--bg-primary: #0A0A0F;
--bg-secondary: #0F0F14;

/* Glass */
--glass-bg: rgba(15, 15, 20, 0.35);
--glass-border: rgba(255, 255, 255, 0.05);

/* Gold Accent */
--gold: #C8A96E;
--gold-light: rgba(200, 169, 110, 0.15);

/* Phase Colors */
--phase-foundation: #3182CE;
--phase-acceleration: #F59E0B;
--phase-mastery: #9F7AEA;

/* State Colors */
--success: #38A169;
--error: #E53E3E;
--warning: #F59E0B;

/* Text */
--text-primary: rgba(255, 255, 255, 0.95);
--text-secondary: rgba(255, 255, 255, 0.65);
--text-tertiary: rgba(255, 255, 255, 0.45);
```

## Additional Features (Nice to Have)

- **Daily Checklist Modal**: Quick view of today's must-dos
- **Weekly Review Modal**: Reflection questions at end of week
- **Progress Chart**: Line/bar chart showing completion over time
- **Share Achievement**: Social sharing when hitting milestones
- **Dark/Light Mode Toggle**: Respect system preference (though dark is primary)
- **Customization**: Edit phase titles/descriptions inline
- **Drag & Drop**: Reorder tasks within domains
- **Notes**: Add personal notes to tasks

## Example Code Structure

```jsx
// GoalTab.jsx
import { motion } from 'framer-motion';
import styles from './GoalTab.module.css';

export const GoalTab = ({ goalId }) => {
  const [goalData, setGoalData] = useState(null);
  const [expandedPhase, setExpandedPhase] = useState(null);

  useEffect(() => {
    fetchGoalData(goalId);
  }, [goalId]);

  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <motion.div
        className={styles.hero}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        {/* Streak, Progress Ring, etc. */}
      </motion.div>

      {/* Phase Timeline */}
      <div className={styles.phaseTimeline}>
        {phases.map((phase, idx) => (
          <PhaseCard
            key={phase.phase_number}
            phase={phase}
            isExpanded={expandedPhase === idx}
            onToggle={() => setExpandedPhase(idx === expandedPhase ? null : idx)}
          />
        ))}
      </div>

      {/* Daily Schedule */}
      <DailySchedulePanel schedule={dailySchedule} />
    </div>
  );
};
```

## Deliverables

Build a complete, production-ready Goal Builder page with:
1. ✅ Full component implementation (GoalTab.jsx)
2. ✅ Complete CSS Module styles (GoalTab.module.css)
3. ✅ All animations using Framer Motion
4. ✅ Responsive design (mobile, tablet, desktop)
5. ✅ Accessibility features (ARIA, keyboard nav)
6. ✅ State management for interactions
7. ✅ API integration points (fetch, update, complete)
8. ✅ Loading, empty, and error states
9. ✅ Micro-interactions and hover states
10. ✅ Premium, cinematic, Apple-level polish

**Remember**: This is the main interface users will see daily. Every pixel matters. Make it feel like a premium product worth using every day for 180 days. No generic Bootstrap/Material UI vibes - this should feel custom-built and luxurious.
