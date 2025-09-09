<script setup>
import FeatureCard from '../components/FeatureCard.vue'
</script>

<template>
  <div>
    <!-- Hero welcome area -->
    <div class="container text-center my-5">
      <h2>Rediscovering sub-health</h2>
      <p>Welcome to the Healthy Living Recommendation Platform</p>
      <button class="btn btn-outline-dark">Start self-testing</button>
    </div>

    <!-- Three Functional Introduction Areas -->
    <div class="container d-flex justify-content-center gap-4 my-5 flex-wrap">
      <div class="row g-4">
        <div class="col-md-4">
          <FeatureCard
            title="Health Self-Test"
            description="A quick look at your health"
            link="/Programs"
          />
        </div>
        <div class="col-md-4">
          <FeatureCard
            title="Dietary Recommendations"
            description="Recommended nutritional recipes for you"
            link="/Rate"
          />
        </div>
        <div class="col-md-4">
          <FeatureCard
            title="Habit tracking"
            description="Record Your Healthy Habits"
            link="/Programs"
          />
        </div>
      </div>
    </div>

    <!-- CTA Registration Guidance Area -->
    <div class="text-center mb-4">
      <p>Start your health journey！</p>
      <router-link to="/signup">[Sign up]</router-link>
      <router-link to="/login">[Log in]</router-link>
    </div>

    <!-- Footer area -->
    <footer class="bg-light text-center py-3">
      <small>© 2025 Xueying Xu | <a href="#"></a> </small>
    </footer>
  </div>
</template>

<style scoped>
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
