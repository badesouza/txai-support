terraform {
  required_version = ">= 1.7.0"

  backend "gcs" {}

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    rediscloud = {
      source  = "RedisLabs/rediscloud"
      version = "~> 2.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "rediscloud" {
  api_key    = var.redis_cloud_api_key
  secret_key = var.redis_cloud_secret_key
}
