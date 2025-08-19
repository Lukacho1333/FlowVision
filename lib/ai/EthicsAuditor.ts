import { AIResponse } from './MultiModelService';

export interface BiasDetectionResult {
  overallRisk: 'low' | 'medium' | 'high';
  detectedBiases: BiasType[];
  recommendations: string[];
  confidence: number;
}

export interface FairnessMetric {
  name: string;
  value: number;
  threshold: number;
  passed: boolean;
  description: string;
}

export interface EthicsAuditReport {
  id: string;
  timestamp: string;
  model: string;
  prompt: string;
  response: string;
  biasDetection: BiasDetectionResult;
  fairnessMetrics: FairnessMetric[];
  complianceChecks: ComplianceCheck[];
  overallScore: number;
  recommendations: string[];
  approved: boolean;
}

export type BiasType = 
  | 'gender' 
  | 'racial' 
  | 'age' 
  | 'religious' 
  | 'socioeconomic' 
  | 'geographical' 
  | 'cultural'
  | 'professional'
  | 'disability';

export interface ComplianceCheck {
  regulation: string;
  passed: boolean;
  details: string;
  severity: 'info' | 'warning' | 'error';
}

export class AIEthicsAuditor {
  private biasKeywords: Map<BiasType, string[]>;
  private fairnessThresholds: Map<string, number>;

  constructor() {
    this.initializeBiasKeywords();
    this.initializeFairnessThresholds();
  }

  private initializeBiasKeywords() {
    this.biasKeywords = new Map([
      ['gender', ['male', 'female', 'man', 'woman', 'masculine', 'feminine', 'boy', 'girl']],
      ['racial', ['white', 'black', 'asian', 'hispanic', 'latino', 'african', 'european', 'race']],
      ['age', ['young', 'old', 'elderly', 'senior', 'millennial', 'boomer', 'teenager', 'adult']],
      ['religious', ['christian', 'muslim', 'jewish', 'hindu', 'buddhist', 'atheist', 'religious']],
      ['socioeconomic', ['rich', 'poor', 'wealthy', 'income', 'class', 'poverty', 'luxury']],
      ['geographical', ['urban', 'rural', 'city', 'country', 'developed', 'developing', 'third world']],
      ['cultural', ['culture', 'tradition', 'custom', 'ethnic', 'native', 'immigrant', 'foreign']],
      ['professional', ['engineer', 'lawyer', 'doctor', 'teacher', 'worker', 'executive', 'manager']],
      ['disability', ['disabled', 'handicapped', 'impaired', 'blind', 'deaf', 'wheelchair', 'special needs']],
    ]);
  }

  private initializeFairnessThresholds() {
    this.fairnessThresholds = new Map([
      ['demographic_parity', 0.1], // Max 10% difference
      ['equal_opportunity', 0.1],
      ['treatment_equality', 0.05], // Max 5% difference
      ['outcome_fairness', 0.15],
    ]);
  }

  async auditAIResponse(
    prompt: string, 
    response: AIResponse, 
    context?: { domain: string; userDemographics?: Record<string, any> }
  ): Promise<EthicsAuditReport> {
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const biasDetection = await this.detectBias(prompt, response.content);
    const fairnessMetrics = await this.calculateFairnessMetrics(prompt, response.content, context);
    const complianceChecks = await this.performComplianceChecks(prompt, response.content, context);
    
    const overallScore = this.calculateOverallScore(biasDetection, fairnessMetrics, complianceChecks);
    const recommendations = this.generateRecommendations(biasDetection, fairnessMetrics, complianceChecks);
    
    const approved = overallScore >= 7.0 && biasDetection.overallRisk !== 'high';

    return {
      id: auditId,
      timestamp: new Date().toISOString(),
      model: response.model,
      prompt,
      response: response.content,
      biasDetection,
      fairnessMetrics,
      complianceChecks,
      overallScore,
      recommendations,
      approved,
    };
  }

  private async detectBias(prompt: string, response: string): Promise<BiasDetectionResult> {
    const combinedText = `${prompt} ${response}`.toLowerCase();
    const detectedBiases: BiasType[] = [];
    let totalBiasScore = 0;
    let biasCount = 0;

    for (const [biasType, keywords] of this.biasKeywords) {
      const matches = keywords.filter(keyword => 
        combinedText.includes(keyword.toLowerCase())
      );

      if (matches.length > 0) {
        detectedBiases.push(biasType);
        
        // Calculate bias intensity based on frequency and context
        const frequency = matches.length;
        const contextScore = this.analyzeBiasContext(combinedText, matches);
        totalBiasScore += frequency * contextScore;
        biasCount++;
      }
    }

    const averageBiasScore = biasCount > 0 ? totalBiasScore / biasCount : 0;
    const overallRisk = this.calculateRiskLevel(averageBiasScore, detectedBiases.length);
    const confidence = Math.min(0.9, 0.5 + (biasCount * 0.1));

    const recommendations = this.generateBiasRecommendations(detectedBiases, overallRisk);

    return {
      overallRisk,
      detectedBiases,
      recommendations,
      confidence,
    };
  }

  private analyzeBiasContext(text: string, matches: string[]): number {
    // Analyze if bias words appear in negative or stereotypical contexts
    let contextScore = 1.0;
    
    const negativeContextWords = ['bad', 'wrong', 'inferior', 'less', 'poor', 'weak', 'stupid'];
    const positiveContextWords = ['good', 'better', 'superior', 'smart', 'strong', 'excellent'];
    
    for (const match of matches) {
      const matchIndex = text.indexOf(match);
      const contextWindow = text.substring(
        Math.max(0, matchIndex - 50), 
        Math.min(text.length, matchIndex + match.length + 50)
      );
      
      const negativeCount = negativeContextWords.filter(word => 
        contextWindow.includes(word)
      ).length;
      
      const positiveCount = positiveContextWords.filter(word => 
        contextWindow.includes(word)
      ).length;
      
      if (negativeCount > positiveCount) {
        contextScore += 0.5; // Increase bias score for negative context
      }
    }

    return contextScore;
  }

  private calculateRiskLevel(biasScore: number, biasTypeCount: number): 'low' | 'medium' | 'high' {
    if (biasScore > 5 || biasTypeCount > 3) return 'high';
    if (biasScore > 2 || biasTypeCount > 1) return 'medium';
    return 'low';
  }

  private async calculateFairnessMetrics(
    prompt: string, 
    response: string, 
    context?: { domain: string; userDemographics?: Record<string, any> }
  ): Promise<FairnessMetric[]> {
    const metrics: FairnessMetric[] = [];

    // Demographic Parity - equal treatment across groups
    const demographicParity = await this.calculateDemographicParity(response, context);
    metrics.push({
      name: 'Demographic Parity',
      value: demographicParity,
      threshold: this.fairnessThresholds.get('demographic_parity')!,
      passed: demographicParity <= this.fairnessThresholds.get('demographic_parity')!,
      description: 'Measures equal treatment across demographic groups',
    });

    // Equal Opportunity - equal true positive rates
    const equalOpportunity = await this.calculateEqualOpportunity(response);
    metrics.push({
      name: 'Equal Opportunity',
      value: equalOpportunity,
      threshold: this.fairnessThresholds.get('equal_opportunity')!,
      passed: equalOpportunity <= this.fairnessThresholds.get('equal_opportunity')!,
      description: 'Ensures equal positive outcomes across groups',
    });

    // Treatment Equality - consistent response quality
    const treatmentEquality = await this.calculateTreatmentEquality(response);
    metrics.push({
      name: 'Treatment Equality',
      value: treatmentEquality,
      threshold: this.fairnessThresholds.get('treatment_equality')!,
      passed: treatmentEquality <= this.fairnessThresholds.get('treatment_equality')!,
      description: 'Measures consistency in response quality',
    });

    return metrics;
  }

  private async calculateDemographicParity(response: string, context?: any): Promise<number> {
    // Simplified calculation - in practice, would analyze response patterns
    // across different demographic groups from historical data
    const responseLength = response.length;
    const averageResponseLength = 500; // Historical average
    
    return Math.abs(responseLength - averageResponseLength) / averageResponseLength;
  }

  private async calculateEqualOpportunity(response: string): Promise<number> {
    // Analyze if the response provides equal opportunities/suggestions
    // regardless of implicit demographic assumptions
    const opportunityKeywords = ['opportunity', 'chance', 'possibility', 'option', 'available'];
    const matches = opportunityKeywords.filter(keyword => 
      response.toLowerCase().includes(keyword)
    );
    
    // More opportunity language generally indicates better equal opportunity
    return Math.max(0, 0.2 - (matches.length * 0.05));
  }

  private async calculateTreatmentEquality(response: string): Promise<number> {
    // Measure consistency in response quality metrics
    const qualityIndicators = {
      detailLevel: response.length > 200 ? 1 : 0,
      actionableAdvice: /\b(should|could|try|consider|recommend)\b/gi.test(response) ? 1 : 0,
      specificity: /\b(specific|particular|exact|precise)\b/gi.test(response) ? 1 : 0,
    };
    
    const qualityScore = Object.values(qualityIndicators).reduce((sum, val) => sum + val, 0) / 3;
    const expectedQuality = 0.7; // Target quality threshold
    
    return Math.abs(qualityScore - expectedQuality);
  }

  private async performComplianceChecks(
    prompt: string, 
    response: string, 
    context?: any
  ): Promise<ComplianceCheck[]> {
    const checks: ComplianceCheck[] = [];

    // GDPR Privacy Check
    const gdprCheck = this.checkGDPRCompliance(prompt, response);
    checks.push(gdprCheck);

    // Accessibility Guidelines
    const accessibilityCheck = this.checkAccessibilityCompliance(response);
    checks.push(accessibilityCheck);

    // Ethical AI Guidelines
    const ethicsCheck = this.checkEthicalGuidelines(response);
    checks.push(ethicsCheck);

    // Industry-specific compliance
    if (context?.domain) {
      const industryCheck = this.checkIndustryCompliance(response, context.domain);
      checks.push(industryCheck);
    }

    return checks;
  }

  private checkGDPRCompliance(prompt: string, response: string): ComplianceCheck {
    const personalDataKeywords = ['email', 'phone', 'address', 'ssn', 'credit card', 'personal'];
    const containsPersonalData = personalDataKeywords.some(keyword => 
      `${prompt} ${response}`.toLowerCase().includes(keyword)
    );

    return {
      regulation: 'GDPR',
      passed: !containsPersonalData || response.includes('privacy') || response.includes('consent'),
      details: containsPersonalData 
        ? 'Personal data detected - ensure proper consent and privacy measures'
        : 'No personal data handling detected',
      severity: containsPersonalData ? 'warning' : 'info',
    };
  }

  private checkAccessibilityCompliance(response: string): ComplianceCheck {
    const accessibilityTerms = ['accessible', 'disability', 'screen reader', 'alternative'];
    const considersAccessibility = accessibilityTerms.some(term => 
      response.toLowerCase().includes(term)
    );

    // Check if response could exclude people with disabilities
    const exclusionaryTerms = ['see', 'look', 'hear', 'click', 'visual'];
    const hasExclusionaryLanguage = exclusionaryTerms.some(term => 
      response.toLowerCase().includes(`you must ${term}`) || 
      response.toLowerCase().includes(`you need to ${term}`)
    );

    return {
      regulation: 'WCAG 2.1',
      passed: considersAccessibility || !hasExclusionaryLanguage,
      details: hasExclusionaryLanguage 
        ? 'Response may exclude users with disabilities'
        : 'Response appears accessible',
      severity: hasExclusionaryLanguage ? 'warning' : 'info',
    };
  }

  private checkEthicalGuidelines(response: string): ComplianceCheck {
    const harmfulContent = ['violence', 'illegal', 'discriminat', 'harmful', 'dangerous'];
    const containsHarmfulContent = harmfulContent.some(term => 
      response.toLowerCase().includes(term)
    );

    return {
      regulation: 'Ethical AI Guidelines',
      passed: !containsHarmfulContent,
      details: containsHarmfulContent 
        ? 'Response may contain harmful content'
        : 'Response follows ethical guidelines',
      severity: containsHarmfulContent ? 'error' : 'info',
    };
  }

  private checkIndustryCompliance(response: string, domain: string): ComplianceCheck {
    const complianceRules = {
      healthcare: {
        keywords: ['medical', 'diagnosis', 'treatment', 'health'],
        disclaimer: 'medical advice',
      },
      finance: {
        keywords: ['investment', 'financial', 'money', 'trading'],
        disclaimer: 'financial advice',
      },
      legal: {
        keywords: ['legal', 'law', 'court', 'attorney'],
        disclaimer: 'legal advice',
      },
    };

    const rules = complianceRules[domain as keyof typeof complianceRules];
    if (!rules) {
      return {
        regulation: `${domain} Industry Standards`,
        passed: true,
        details: 'No specific industry compliance rules defined',
        severity: 'info',
      };
    }

    const containsRegulatedContent = rules.keywords.some(keyword => 
      response.toLowerCase().includes(keyword)
    );
    
    const hasProperDisclaimer = response.toLowerCase().includes(`not ${rules.disclaimer}`);

    return {
      regulation: `${domain} Industry Standards`,
      passed: !containsRegulatedContent || hasProperDisclaimer,
      details: containsRegulatedContent && !hasProperDisclaimer
        ? `Response provides ${rules.disclaimer} without proper disclaimer`
        : 'Compliant with industry standards',
      severity: containsRegulatedContent && !hasProperDisclaimer ? 'error' : 'info',
    };
  }

  private calculateOverallScore(
    biasDetection: BiasDetectionResult,
    fairnessMetrics: FairnessMetric[],
    complianceChecks: ComplianceCheck[]
  ): number {
    // Base score starts at 10
    let score = 10;

    // Deduct for bias risk
    switch (biasDetection.overallRisk) {
      case 'high': score -= 4; break;
      case 'medium': score -= 2; break;
      case 'low': score -= 0.5; break;
    }

    // Deduct for failed fairness metrics
    const failedMetrics = fairnessMetrics.filter(m => !m.passed).length;
    score -= failedMetrics * 1.5;

    // Deduct for compliance violations
    const violations = complianceChecks.filter(c => !c.passed);
    score -= violations.length * 2;
    
    // Severity-based deductions
    violations.forEach(violation => {
      if (violation.severity === 'error') score -= 1;
      if (violation.severity === 'warning') score -= 0.5;
    });

    return Math.max(0, Math.min(10, score));
  }

  private generateRecommendations(
    biasDetection: BiasDetectionResult,
    fairnessMetrics: FairnessMetric[],
    complianceChecks: ComplianceCheck[]
  ): string[] {
    const recommendations: string[] = [];

    // Bias recommendations
    recommendations.push(...biasDetection.recommendations);

    // Fairness recommendations
    fairnessMetrics.filter(m => !m.passed).forEach(metric => {
      recommendations.push(`Improve ${metric.name}: ${metric.description}`);
    });

    // Compliance recommendations
    complianceChecks.filter(c => !c.passed).forEach(check => {
      recommendations.push(`Address ${check.regulation} compliance: ${check.details}`);
    });

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('Response meets ethics and fairness standards');
    } else {
      recommendations.push('Consider retraining model with more diverse datasets');
      recommendations.push('Implement additional bias detection in preprocessing');
    }

    return recommendations;
  }

  private generateBiasRecommendations(detectedBiases: BiasType[], risk: string): string[] {
    const recommendations: string[] = [];

    if (detectedBiases.length === 0) {
      return ['No significant bias detected'];
    }

    detectedBiases.forEach(bias => {
      switch (bias) {
        case 'gender':
          recommendations.push('Use gender-neutral language and avoid stereotypical assumptions');
          break;
        case 'racial':
          recommendations.push('Ensure cultural sensitivity and avoid racial generalizations');
          break;
        case 'age':
          recommendations.push('Avoid age-based assumptions about capabilities or preferences');
          break;
        case 'disability':
          recommendations.push('Use inclusive language that considers accessibility needs');
          break;
        default:
          recommendations.push(`Address ${bias} bias through inclusive language and diverse perspectives`);
      }
    });

    if (risk === 'high') {
      recommendations.push('Consider regenerating response with explicit bias mitigation prompts');
    }

    return recommendations;
  }
}

// Singleton instance
export const ethicsAuditor = new AIEthicsAuditor();
