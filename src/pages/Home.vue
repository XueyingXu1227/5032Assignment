<script setup>
import FeatureCard from '../components/FeatureCard.vue'
</script>

<template>
  <div>
    <!-- center hero content and adapt to all screen sizes -->
    <!-- router-links direct to feature pages -->
    <div class="container text-center my-5">
      <h1>Rediscovering sub-health</h1>
      <p>Welcome to the Healthy Living Recommendation Platform</p>
      <!-- quick access to quiz even before login -->
      <router-link to="/quiz" class="btn btn-outline-dark">Start self-testing</router-link>
    </div>

    <!-- cards arranged in flexible grid -->
    <!-- each card uses props for title and description -->
    <div class="container d-flex justify-content-center gap-4 my-5 flex-wrap">
      <div class="row g-4">
        <div class="col-md-4">
          <FeatureCard
            title="Health Self-Test"
            description="A quick look at your health"
            link="/Quiz"
          />
        </div>
        <div class="col-md-4">
          <FeatureCard
            title="Dietary Recommendations"
            description="Recommended nutritional recipes for you"
            link="/Programs"
          />
        </div>
        <div class="col-md-4">
          <FeatureCard
            title="Habit tracking"
            description="Record Your Healthy Habits"
            link="/Tracker"
          />
        </div>
      </div>
    </div>

    <!-- guide users to sign up or log in -->
    <!-- clear text and link labels for new users -->
    <div class="text-center mb-4">
      <p>Start your health journey!</p>
      <router-link to="/signup">[Sign up]</router-link>
      <router-link to="/login">[Log in]</router-link>
    </div>
  </div>
</template>

<style scoped>
/* structure main sections for clear layout */
.hero {
  text-align: center;
  margin: 40px 0;
}
.features {
  display: flex;
  justify-content: space-around;
  margin: 30px 0;
}
.cta {
  text-align: center;
  margin-top: 50px;
}
</style>
