import { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Flame,
  Star,
  Target,
  Zap,
  Award,
  ChevronRight,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface Challenge {
  id: string;
  title: string;
  description: string;
  xp: number;
  progress: number;
  total: number;
  icon: React.ElementType;
  color: string;
  deadline?: string;
}

interface SkillBadge {
  id: string;
  name: string;
  icon: string;
  level: number;
  maxLevel: number;
  color: string;
}

const skillBadges: SkillBadge[] = [
  { id: '1', name: 'React Pro', icon: '⚛️', level: 3, maxLevel: 5, color: 'bg-cyan-500' },
  { id: '2', name: 'Python Master', icon: '🐍', level: 2, maxLevel: 5, color: 'bg-green-500' },
  { id: '3', name: 'AI Explorer', icon: '🤖', level: 1, maxLevel: 5, color: 'bg-purple-500' },
  { id: '4', name: 'Cloud Architect', icon: '☁️', level: 4, maxLevel: 5, color: 'bg-blue-500' },
];

interface GamificationWidgetProps {
  userXP?: number;
  userLevel?: number;
  streak?: number;
}

// Memoized Challenge Item Component
const ChallengeItem = memo(({ challenge }: { challenge: Challenge }) => (
  <div className="bg-secondary/50 rounded-xl p-3">
    <div className="flex items-start gap-3">
      <div className={`w-10 h-10 rounded-lg bg-secondary flex items-center justify-center ${challenge.color}`}>
        <challenge.icon className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm">{challenge.title}</span>
          <Badge variant="outline" className="text-xs">
            +{challenge.xp} XP
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {challenge.description}
        </p>
        <div className="mt-2">
          <Progress
            value={(challenge.progress / challenge.total) * 100}
            className="h-1.5"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {challenge.progress}/{challenge.total} completed
          </p>
        </div>
      </div>
    </div>
  </div>
));

ChallengeItem.displayName = "ChallengeItem";

// Memoized Skill Badge Item Component
const SkillBadgeItem = memo(({ badge }: { badge: SkillBadge }) => {
  const starsArray = useMemo(() => Array.from({ length: badge.maxLevel }), [badge.maxLevel]);

  return (
    <div className="bg-secondary/50 rounded-xl p-3 text-center">
      <div className="text-3xl mb-1">{badge.icon}</div>
      <p className="font-medium text-sm">{badge.name}</p>
      <div className="flex items-center justify-center gap-1 mt-1">
        {starsArray.map((_, i) => (
          <Star
            key={i}
            className={`w-3 h-3 ${i < badge.level
              ? 'text-yellow-500 fill-yellow-500'
              : 'text-muted-foreground/30'
              }`}
          />
        ))}
      </div>
    </div>
  );
});

SkillBadgeItem.displayName = "SkillBadgeItem";

const GamificationWidget = memo(({
  userXP = 0,
  userLevel = 1,
  streak = 0
}: GamificationWidgetProps) => {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [dailyChallenges, setDailyChallenges] = useState<Challenge[]>([]);
  const [realUserXP, setRealUserXP] = useState(userXP);
  const [realUserLevel, setRealUserLevel] = useState(userLevel);
  const xpToNextLevel = 500;

  const currentLevelProgress = useMemo(() =>
    (realUserXP % xpToNextLevel) / xpToNextLevel * 100,
    [realUserXP, xpToNextLevel]
  );

  const fetchChallengeProgress = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user's real XP and level
      const { data: profile } = await supabase
        .from('profiles')
        .select('xp, level')
        .eq('id', user.id)
        .single();

      if (profile) {
        setRealUserXP(profile.xp || 0);
        setRealUserLevel(profile.level || 1);
      }

      // Get today's date for daily challenges
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Challenge 1: First post of the day
      const { count: postsToday } = await supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString());

      // Challenge 2: Like and comment on 5 posts
      const { count: likesComments } = await supabase
        .from('likes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString());

      const { count: commentsCount } = await supabase
        .from('comments')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString());

      const engagementCount = Math.min((likesComments || 0) + (commentsCount || 0), 5);

      // Challenge 3: Share a code snippet (posts with code blocks)
      const { count: codeSnippets } = await supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString())
        .or('content.ilike.%```%,content.ilike.%code%');

      const challenges: Challenge[] = [
        {
          id: '1',
          title: 'First Post of the Day',
          description: 'Create your first post today',
          xp: 50,
          progress: Math.min(postsToday || 0, 1),
          total: 1,
          icon: Target,
          color: 'text-blue-500'
        },
        {
          id: '2',
          title: 'Engagement Master',
          description: 'Like and comment on 5 posts',
          xp: 75,
          progress: engagementCount,
          total: 5,
          icon: Flame,
          color: 'text-orange-500'
        },
        {
          id: '3',
          title: 'Knowledge Sharer',
          description: 'Share a code snippet or tutorial',
          xp: 100,
          progress: Math.min(codeSnippets || 0, 1),
          total: 1,
          icon: Zap,
          color: 'text-yellow-500'
        }
      ];

      setDailyChallenges(challenges);

    } catch (error) {
      console.error('Error fetching challenge progress:', error);
      // Fallback to default challenges with 0 progress
      setDailyChallenges([
        {
          id: '1',
          title: 'First Post of the Day',
          description: 'Create your first post today',
          xp: 50,
          progress: 0,
          total: 1,
          icon: Target,
          color: 'text-blue-500'
        },
        {
          id: '2',
          title: 'Engagement Master',
          description: 'Like and comment on 5 posts',
          xp: 75,
          progress: 0,
          total: 5,
          icon: Flame,
          color: 'text-orange-500'
        },
        {
          id: '3',
          title: 'Knowledge Sharer',
          description: 'Share a code snippet or tutorial',
          xp: 100,
          progress: 0,
          total: 1,
          icon: Zap,
          color: 'text-yellow-500'
        }
      ]);
    }
  }, []); // Removed isExpanded dependency as it's not used inside

  useEffect(() => {
    if (isExpanded) {
      fetchChallengeProgress();
    }
  }, [isExpanded, fetchChallengeProgress]);

  useEffect(() => {
    if (!isExpanded) return;

    const channel = supabase
      .channel('challenge-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        () => {
          fetchChallengeProgress();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'likes' },
        () => {
          fetchChallengeProgress();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments' },
        () => {
          fetchChallengeProgress();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isExpanded, fetchChallengeProgress]);

  return (
    <>
      {/* Compact Widget */}
      <motion.button
        onClick={() => setIsExpanded(true)}
        className="flex items-center gap-3 bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 rounded-2xl p-3 hover:border-primary/40 transition-all w-full"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold">
            {realUserLevel}
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
            <Flame className="w-3 h-3 text-white" />
          </div>
        </div>

        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">Level {realUserLevel}</span>
            <Badge variant="secondary" className="text-xs">
              <Flame className="w-3 h-3 mr-1 text-orange-500" />
              {streak} day streak
            </Badge>
          </div>
          <div className="mt-1">
            <Progress value={currentLevelProgress} className="h-1.5" />
            <p className="text-xs text-muted-foreground mt-0.5">
              {realUserXP % xpToNextLevel}/{xpToNextLevel} XP to Level {realUserLevel + 1}
            </p>
          </div>
        </div>

        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </motion.button>

      {/* Expanded Modal */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
            onClick={() => setIsExpanded(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-primary to-purple-600 p-6 text-white relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsExpanded(false)}
                  className="absolute top-4 right-4 text-white hover:bg-white/20"
                >
                  <X className="w-5 h-5" />
                </Button>

                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold">
                    {realUserLevel}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Level {realUserLevel}</h2>
                    <p className="opacity-80">{realUserXP.toLocaleString()} Total XP</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Flame className="w-4 h-4 text-orange-300" />
                      <span className="text-sm">{streak} day streak!</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progress to Level {realUserLevel + 1}</span>
                    <span>{Math.round(currentLevelProgress)}%</span>
                  </div>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all"
                      style={{ width: `${currentLevelProgress}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-6 overflow-y-auto max-h-[50vh]">
                {/* Daily Challenges */}
                <div>
                  <h3 className="font-semibold flex items-center gap-2 mb-3">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    Daily Challenges
                  </h3>
                  <div className="space-y-3">
                    {dailyChallenges.length === 0 ? (
                      <div className="text-center text-muted-foreground text-sm py-4">
                        Loading challenges...
                      </div>
                    ) : (
                      dailyChallenges.map((challenge) => (
                        <ChallengeItem key={challenge.id} challenge={challenge} />
                      ))
                    )}
                  </div>
                </div>

                {/* Skill Badges */}
                <div>
                  <h3 className="font-semibold flex items-center gap-2 mb-3">
                    <Award className="w-5 h-5 text-primary" />
                    Your Skill Badges
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {skillBadges.map((badge) => (
                      <SkillBadgeItem key={badge.id} badge={badge} />
                    ))}
                  </div>
                </div>

                <Button
                  className="w-full mt-4 gradient-primary text-white font-bold h-12 rounded-xl flex items-center justify-center gap-2"
                  onClick={() => navigate('/hall-of-fame')}
                >
                  <Trophy className="w-5 h-5" />
                  View Global Hall of Fame
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

export default GamificationWidget;
