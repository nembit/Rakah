import { Redirect } from "expo-router";
import usePrayerStore from "@/store/prayerStore";

export default function Index() {
  const onboardingComplete = usePrayerStore((s) => s.settings.onboardingComplete);
  return <Redirect href={onboardingComplete ? "/(tabs)/home" : "/onboarding"} />;
}
