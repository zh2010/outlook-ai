/* eslint-disable no-undef */
import * as React from "react";
import { DefaultButton } from "@fluentui/react";
import Progress from "./Progress";
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai";
import { currentConfig } from "../../config/apiConfig";

/* global require */

export interface AppProps {
  title: string;
  isOfficeInitialized: boolean;
}

export interface AppState {
  generatedText: string;
  startText: string;
  finalMailText: string;
  isLoading: boolean;
  isGenerateBusinessMailActive: boolean;
  isSummarizeMailActive: boolean;
  summary: string;
  errorMessage: string;
}

// 统一获取 API 配置：优先使用环境变量（若可用），否则退回到 config
function getApiConfig() {
  // 兼容浏览器环境，避免 process 未定义
  const envApiKey =
    (typeof process !== "undefined" && process.env && (process.env as any).DEEPSEEK_API_KEY) ||
    (typeof window !== "undefined" && (window as any).DEEPSEEK_API_KEY);

  const apiKey = envApiKey || currentConfig.apiKey;
  const basePath = currentConfig.basePath || "https://api.deepseek.com/v1";
  return { apiKey, basePath };
}

export default class App extends React.Component<AppProps, AppState> {
  constructor(props) {
    super(props);

    let isGenerateBusinessMailActive;
    let isSummarizeMailActive;

    //get the current URL
    const url = window.location.href;
    console.log("URL: " + url);
    //check if the URL contains the parameter "generate"
    if (url.indexOf("compose") > -1) {
      console.log("Action: generate business mail");
      isGenerateBusinessMailActive = true;
      isSummarizeMailActive = false;
    }
    //check if the URL contains the parameter "summarize"
    if (url.indexOf("summary") > -1) {
      console.log("Action: summarize mail");
      isGenerateBusinessMailActive = false;
      isSummarizeMailActive = true;
    }

    this.state = {
      generatedText: "",
      startText: "",
      finalMailText: "",
      isLoading: false,
      isGenerateBusinessMailActive: isGenerateBusinessMailActive,
      isSummarizeMailActive: isSummarizeMailActive,
      summary: "",
      errorMessage: "",
    };
  }

  showGenerateBusinessMail = () => {
    this.setState({ isGenerateBusinessMailActive: true, isSummarizeMailActive: false });
  };

  showSummarizeMail = () => {
    this.setState({ isGenerateBusinessMailActive: false, isSummarizeMailActive: true });
  };

  generateText = async () => {
    // eslint-disable-next-line no-undef
    var current = this;
    
    try {
      // 清空之前的错误信息
      current.setState({ errorMessage: "", generatedText: "" });
      
      // 验证输入
      if (!this.state.startText || this.state.startText.trim().length === 0) {
        current.setState({ 
          errorMessage: "请输入要生成邮件的内容描述",
          isLoading: false 
        });
        return;
      }

      // 配置 API
      const { apiKey: API_KEY, basePath: API_BASE } = getApiConfig();
      
      // 验证 API Key
      if (!API_KEY) {
        current.setState({ 
          errorMessage: "错误：DeepSeek API Key 未配置，请在代码中设置正确的 API Key",
          isLoading: false 
        });
        return;
      }

      const configuration = new Configuration({
        apiKey: API_KEY,
        basePath: API_BASE
      });
      const openai = new OpenAIApi(configuration);
      
      current.setState({ isLoading: true });
      
      console.log("正在调用 DeepSeek API...");
      console.log("API Base:", API_BASE);
      console.log("Model: deepseek-chat");
      
      const response = await openai.createChatCompletion({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that can help users to create professional business content.",
          },
          { 
            role: "user", 
            content: "Turn the following text into a professional business mail: " + this.state.startText 
          },
        ],
      });
      
      console.log("API 调用成功！");
      console.log("Response status:", response.status);
      
      // 验证响应
      if (!response || !response.data) {
        throw new Error("API 返回的响应为空");
      }
      
      if (!response.data.choices || response.data.choices.length === 0) {
        throw new Error("API 未返回任何生成结果");
      }
      
      const generatedContent = response.data.choices[0].message?.content;
      
      if (!generatedContent || generatedContent.trim().length === 0) {
        throw new Error("API 返回的内容为空");
      }
      
      console.log("生成的内容长度:", generatedContent.length);
      
      current.setState({ 
        isLoading: false,
        generatedText: generatedContent,
        errorMessage: ""
      });
      
    } catch (error) {
      console.error("DeepSeek API 调用失败:", error);
      
      let errorMsg = "生成邮件失败：";
      
      if (error.response) {
        // API 返回了错误响应
        console.error("API 错误响应:", error.response.status, error.response.data);
        errorMsg += `API 错误 (${error.response.status})`;
        
        if (error.response.status === 401) {
          errorMsg += " - API Key 无效或已过期";
        } else if (error.response.status === 429) {
          errorMsg += " - API 调用次数超限，请稍后重试";
        } else if (error.response.status === 500) {
          errorMsg += " - DeepSeek 服务器错误，请稍后重试";
        } else if (error.response.data?.error?.message) {
          errorMsg += ` - ${error.response.data.error.message}`;
        }
      } else if (error.request) {
        // 请求已发送但没有收到响应
        console.error("网络请求失败:", error.request);
        errorMsg += "网络连接失败，请检查网络连接和 API 地址是否正确";
      } else {
        // 其他错误
        errorMsg += error.message || "未知错误";
      }
      
      current.setState({ 
        isLoading: false,
        errorMessage: errorMsg,
        generatedText: ""
      });
    }
  };

  insertIntoMail = () => {
    const finalText = this.state.finalMailText.length === 0 ? this.state.generatedText : this.state.finalMailText;
    Office.context.mailbox.item.body.setSelectedDataAsync(finalText, {
      coercionType: Office.CoercionType.Text,
    });
  };

  onSummarize = async () => {
    try {
      this.setState({ isLoading: true, errorMessage: "", summary: "" });
      const summary = await this.summarizeMail();
      this.setState({ summary: summary, isLoading: false, errorMessage: "" });
    } catch (error) {
      console.error("邮件总结失败:", error);
      const errorMsg = error.message || error.toString();
      this.setState({ 
        summary: "", 
        isLoading: false,
        errorMessage: `邮件总结失败：${errorMsg}`
      });
    }
  };

  summarizeMail(): Promise<any> {
    return new Office.Promise(function (resolve, reject) {
      try {
        Office.context.mailbox.item.body.getAsync(Office.CoercionType.Text, async function (asyncResult) {
          try {
            // 验证邮件内容获取是否成功
            if (asyncResult.status !== Office.AsyncResultStatus.Succeeded) {
              reject(new Error("无法读取邮件内容：" + asyncResult.error.message));
              return;
            }

            const mailContent = asyncResult.value;
            
            // 验证邮件内容
            if (!mailContent || mailContent.trim().length === 0) {
              reject(new Error("邮件内容为空，无法总结"));
              return;
            }

            const { apiKey: API_KEY, basePath: API_BASE } = getApiConfig();
            
            // 验证 API Key
            if (!API_KEY) {
              reject(new Error("DeepSeek API Key 未配置"));
              return;
            }

            const configuration = new Configuration({
              apiKey: API_KEY,
              basePath: API_BASE
            });
            const openai = new OpenAIApi(configuration);

            // 取前 800 个单词
            const mailText = mailContent.split(" ").slice(0, 800).join(" ");
            
            console.log("正在总结邮件...");
            console.log("邮件内容长度:", mailText.length);

            const messages: ChatCompletionRequestMessage[] = [
              {
                role: "system",
                content:
                  "You are a helpful assistant that can help users to better manage emails. The mail thread can be made by multiple prompts.",
              },
              {
                role: "user",
                content: "Summarize the following mail thread and summarize it with a bullet list: " + mailText,
              },
            ];

            const response = await openai.createChatCompletion({
              model: "deepseek-chat",
              messages: messages,
            });

            console.log("邮件总结完成！");

            // 验证响应
            if (!response || !response.data) {
              reject(new Error("API 返回的响应为空"));
              return;
            }
            
            if (!response.data.choices || response.data.choices.length === 0) {
              reject(new Error("API 未返回任何总结结果"));
              return;
            }
            
            const summaryContent = response.data.choices[0].message?.content;
            
            if (!summaryContent || summaryContent.trim().length === 0) {
              reject(new Error("API 返回的总结内容为空"));
              return;
            }

            resolve(summaryContent);
            
          } catch (error) {
            console.error("总结邮件时发生错误:", error);
            
            let errorMsg = "总结失败";
            
            if (error.response) {
              errorMsg += ` - API 错误 (${error.response.status})`;
              if (error.response.status === 401) {
                errorMsg += ": API Key 无效";
              } else if (error.response.status === 429) {
                errorMsg += ": API 调用次数超限";
              } else if (error.response.data?.error?.message) {
                errorMsg += `: ${error.response.data.error.message}`;
              }
            } else if (error.request) {
              errorMsg += " - 网络连接失败";
            } else {
              errorMsg += `: ${error.message}`;
            }
            
            reject(new Error(errorMsg));
          }
        });
      } catch (error) {
        console.error("读取邮件时发生错误:", error);
        reject(error);
      }
    });
  }

  ProgressSection = () => {
    if (this.state.isLoading) {
      return <Progress title="Loading..." message="The AI is working..." />;
    } else {
      return <> </>;
    }
  };

  ErrorSection = () => {
    if (this.state.errorMessage && this.state.errorMessage.length > 0) {
      return (
        <div style={{ 
          padding: "10px", 
          margin: "10px 0", 
          backgroundColor: "#fef0f0", 
          border: "1px solid #f5c6cb",
          borderRadius: "4px",
          color: "#721c24"
        }}>
          <strong>❌ 错误：</strong>
          <div style={{ marginTop: "5px" }}>{this.state.errorMessage}</div>
        </div>
      );
    } else {
      return <> </>;
    }
  };

  BusinessMailSection = () => {
    if (this.state.isGenerateBusinessMailActive) {
      return (
        <>
          <p>Briefly describe what you want to communicate in the mail:</p>
          <textarea
            className="ms-welcome"
            onChange={(e) => this.setState({ startText: e.target.value })}
            rows={5}
            cols={40}
          />
          <p>
            <DefaultButton
              className="ms-welcome__action"
              iconProps={{ iconName: "ChevronRight" }}
              onClick={this.generateText}
            >
              Generate text
            </DefaultButton>
          </p>
          <this.ProgressSection />
          <this.ErrorSection />
          <textarea
            className="ms-welcome"
            defaultValue={this.state.generatedText}
            onChange={(e) => this.setState({ finalMailText: e.target.value })}
            rows={15}
            cols={40}
          />
          <p>
            <DefaultButton
              className="ms-welcome__action"
              iconProps={{ iconName: "ChevronRight" }}
              onClick={this.insertIntoMail}
            >
              Insert into mail
            </DefaultButton>
          </p>
        </>
      );
    } else {
      return <div> </div>;
    }
  };

  SummarizeMailSection = () => {
    if (this.state.isSummarizeMailActive) {
      return (
        <>
          <p>Summarize mail</p>
          <DefaultButton
            className="ms-welcome__action"
            iconProps={{ iconName: "ChevronRight" }}
            onClick={this.onSummarize}
          >
            Summarize mail
          </DefaultButton>
          <this.ProgressSection />
          <this.ErrorSection />
          <textarea className="ms-welcome" defaultValue={this.state.summary} rows={15} cols={40} />
        </>
      );
    } else {
      return <div> </div>;
    }
  };

  render() {
    const { title, isOfficeInitialized } = this.props;

    if (!isOfficeInitialized) {
      return (
        <Progress
          title={title}
          logo={require("./../../../assets/logo-filled.png")}
          message="Please sideload your addin to see app body."
        />
      );
    }

    return (
      <div className="ms-welcome">
        <main className="ms-welcome__main">
          <h2 className="ms-font-xl ms-fontWeight-semilight ms-fontColor-neutralPrimary ms-u-slideUpIn20">
            Outlook AI Assistant
          </h2>

          <p className="ms-font-l ms-fontWeight-semilight ms-fontColor-neutralPrimary ms-u-slideUpIn20">
            Choose your service:
          </p>
          <p>
            <DefaultButton
              className="ms-welcome__action"
              iconProps={{ iconName: "ChevronRight" }}
              onClick={this.showGenerateBusinessMail}
            >
              Generate business mail
            </DefaultButton>
          </p>
          <p>
            <DefaultButton
              className="ms-welcome__action"
              iconProps={{ iconName: "ChevronRight" }}
              onClick={this.showSummarizeMail}
            >
              Summarize mail
            </DefaultButton>
          </p>
          <div>
            <this.BusinessMailSection />
          </div>
          <div>
            <this.SummarizeMailSection />
          </div>
        </main>
      </div>
    );
  }
}
