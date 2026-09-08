import { FixPlan, Project } from '../../types/index.js';

export interface SafetyCheckResult {
  isSafe: boolean;
  reasons: string[];
  riskRating: 'SAFE' | 'MODERATE' | 'CRITICAL_RISK';
}

export class SafetyGuard {
  public static validate(plan: FixPlan, project: Project): SafetyCheckResult {
    const reasons: string[] = [];

    // 1. Confidence threshold check
    const minThreshold = project.autoFixThreshold || 90;
    if (plan.confidenceScore < minThreshold && plan.classification === 'SAFE_AUTO_FIX') {
      reasons.push(`Confidence score (${plan.confidenceScore}%) is below project safety threshold (${minThreshold}%).`);
    }

    // 2. Prohibited deletion check
    if (plan.beforeContent.length > plan.afterContent.length * 2 && plan.beforeContent.length > 500) {
      reasons.push('Excessive content reduction detected (>50% deletion). Requires manual review.');
    }

    // 3. Dangerous script / eval checks
    if (plan.afterContent.includes('<script>eval(') || plan.afterContent.includes('document.write(')) {
      reasons.push('Potentially hazardous inline JavaScript pattern detected.');
    }

    // 4. Path traversal / sensitive files check
    const dangerousPaths = ['.env', 'wp-config.php', 'passwd', 'id_rsa', '.git', 'package.json'];
    for (const danger of dangerousPaths) {
      if (plan.targetPath.toLowerCase().includes(danger)) {
        reasons.push(`Target path contains restricted system or configuration file: ${danger}`);
      }
    }

    const isSafe = reasons.length === 0;
    const riskRating = isSafe ? 'SAFE' : (reasons.some(r => r.includes('restricted') || r.includes('hazardous')) ? 'CRITICAL_RISK' : 'MODERATE');

    return {
      isSafe,
      reasons,
      riskRating
    };
  }
}
