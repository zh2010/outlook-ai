/**
 * API Configuration
 * 集中管理大模型API配置
 */

export interface APIConfig {
  apiKey: string;
  basePath?: string;
  model: string;
}

// DeepSeek API 配置
export const deepseekConfig: APIConfig = {
  apiKey: "sk-e3817a81b0e443e4ac63c48ecefd189b", // 建议用环境变量 DEEPSEEK_API_KEY 覆盖
  basePath: "https://api.deepseek.com/v1", // DeepSeek API 端点
  model: "deepseek-chat", // DeepSeek 模型名称
};

// OpenAI API 配置（备用）
// export const openaiConfig: APIConfig = {
//   apiKey: "sk-your-openai-api-key-here",
//   model: "gpt-3.5-turbo",
// };

// 当前使用的配置（切换这里即可）
export const currentConfig = deepseekConfig;

