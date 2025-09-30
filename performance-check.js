#!/usr/bin/env node

/**
 * Performance monitoring script for it-square.hk
 * Checks Core Web Vitals and caching effectiveness
 */

const https = require('https');
const { performance } = require('perf_hooks');

class PerformanceChecker {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.results = {
      timestamp: new Date().toISOString(),
      url: baseUrl,
      metrics: {},
      caching: {},
      recommendations: []
    };
  }

  async checkPageLoad(path = '/') {
    const url = `${this.baseUrl}${path}`;
    console.log(`🔍 Checking page load: ${url}`);
    
    const startTime = performance.now();
    
    return new Promise((resolve, reject) => {
      const req = https.get(url, (res) => {
        const endTime = performance.now();
        const loadTime = endTime - startTime;
        
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const headers = res.headers;
          
          this.results.metrics[path] = {
            loadTime: Math.round(loadTime),
            statusCode: res.statusCode,
            contentLength: parseInt(headers['content-length'] || '0'),
            contentType: headers['content-type'],
            server: headers['server'],
            cacheControl: headers['cache-control'],
            etag: headers['etag'],
            lastModified: headers['last-modified']
          };
          
          // Check caching headers
          this.analyzeCaching(path, headers);
          
          resolve({
            loadTime,
            statusCode: res.statusCode,
            headers,
            bodySize: data.length
          });
        });
      });
      
      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  analyzeCaching(path, headers) {
    const cacheControl = headers['cache-control'] || '';
    const etag = headers['etag'];
    const lastModified = headers['last-modified'];
    
    this.results.caching[path] = {
      hasCacheControl: !!cacheControl,
      cacheControl,
      hasEtag: !!etag,
      hasLastModified: !!lastModified,
      isPublic: cacheControl.includes('public'),
      maxAge: this.extractMaxAge(cacheControl),
      isImmutable: cacheControl.includes('immutable')
    };
    
    // Generate recommendations
    if (!cacheControl) {
      this.results.recommendations.push(`${path}: Missing Cache-Control header`);
    }
    
    if (path.includes('/_next/static/') && !cacheControl.includes('immutable')) {
      this.results.recommendations.push(`${path}: Static assets should have immutable cache`);
    }
    
    if (path === '/' && this.extractMaxAge(cacheControl) > 300) {
      this.results.recommendations.push(`${path}: Homepage cache too long for dynamic content`);
    }
  }

  extractMaxAge(cacheControl) {
    const match = cacheControl.match(/max-age=(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  async checkStaticAssets() {
    console.log('🔍 Checking static assets...');
    
    const staticPaths = [
      '/_next/static/css/app.css',
      '/_next/static/chunks/main.js',
      '/images/logo.png',
      '/favicon.ico'
    ];
    
    for (const path of staticPaths) {
      try {
        await this.checkPageLoad(path);
      } catch (error) {
        console.log(`⚠️  Could not check ${path}: ${error.message}`);
      }
    }
  }

  async checkAPIEndpoints() {
    console.log('🔍 Checking API endpoints...');
    
    const apiPaths = [
      '/api/popular-posts',
      '/api/health'
    ];
    
    for (const path of apiPaths) {
      try {
        await this.checkPageLoad(path);
      } catch (error) {
        console.log(`⚠️  Could not check ${path}: ${error.message}`);
      }
    }
  }

  generateReport() {
    console.log('\n📊 Performance Report');
    console.log('='.repeat(50));
    
    // Page load times
    console.log('\n⏱️  Page Load Times:');
    Object.entries(this.results.metrics).forEach(([path, metrics]) => {
      const status = metrics.loadTime < 500 ? '✅' : 
                    metrics.loadTime < 1000 ? '⚠️' : '❌';
      console.log(`   ${status} ${path}: ${metrics.loadTime}ms`);
    });
    
    // Caching analysis
    console.log('\n🗂️  Caching Analysis:');
    Object.entries(this.results.caching).forEach(([path, cache]) => {
      const status = cache.hasCacheControl ? '✅' : '❌';
      console.log(`   ${status} ${path}: max-age=${cache.maxAge}s`);
    });
    
    // Recommendations
    if (this.results.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      this.results.recommendations.forEach(rec => {
        console.log(`   • ${rec}`);
      });
    }
    
    // Overall score
    const avgLoadTime = Object.values(this.results.metrics)
      .reduce((sum, m) => sum + m.loadTime, 0) / Object.keys(this.results.metrics).length;
    
    const score = avgLoadTime < 500 ? 'Excellent' :
                  avgLoadTime < 1000 ? 'Good' :
                  avgLoadTime < 2000 ? 'Fair' : 'Poor';
    
    console.log(`\n🎯 Overall Performance: ${score} (${Math.round(avgLoadTime)}ms avg)`);
    
    return this.results;
  }

  async runFullCheck() {
    try {
      // Check main pages
      await this.checkPageLoad('/');
      await this.checkPageLoad('/about');
      
      // Check static assets
      await this.checkStaticAssets();
      
      // Check API endpoints
      await this.checkAPIEndpoints();
      
      return this.generateReport();
    } catch (error) {
      console.error('❌ Performance check failed:', error.message);
      throw error;
    }
  }
}

// CLI usage
if (require.main === module) {
  const url = process.argv[2] || 'https://main.d1gzwnduof06os.amplifyapp.com';
  
  console.log(`🚀 Starting performance check for: ${url}`);
  
  const checker = new PerformanceChecker(url);
  checker.runFullCheck()
    .then(results => {
      // Save results
      const fs = require('fs');
      fs.writeFileSync(
        `performance-report-${Date.now()}.json`, 
        JSON.stringify(results, null, 2)
      );
      console.log('\n📄 Report saved to performance-report-*.json');
    })
    .catch(error => {
      console.error('❌ Check failed:', error.message);
      process.exit(1);
    });
}

module.exports = PerformanceChecker;