import { GoogleGenAI, Type } from "@google/genai";
import { Medication } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const model = 'gemini-2.5-flash';

const multipleMedicationsSchema = {
    type: Type.OBJECT,
    properties: {
        medications: {
            type: Type.ARRAY,
            description: "Uma lista de todos os medicamentos extraídos do documento.",
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "Nome do medicamento" },
                    activeIngredient: { type: Type.STRING, description: "Princípio ativo ou substância ativa do medicamento" },
                    manufacturer: { type: Type.STRING, description: "Laboratório fabricante do medicamento" },
                    presentation: { type: Type.STRING, description: "Apresentação do medicamento (ex: 10mg, 30 comprimidos, 500ml)" },
                    class: { type: Type.STRING, description: "Classe terapêutica do medicamento (ex: Analgésico, Antibiótico)" },
                    mechanismOfAction: { type: Type.STRING, description: "Breve descrição do mecanismo de ação" },
                    expirationDate: { type: Type.STRING, description: "Data de validade no formato YYYY-MM-DD" },
                    barcode: { type: Type.STRING, description: "Número do código de barras" },
                    pmc: { type: Type.NUMBER, description: "Preço Médio ao Consumidor (PMC), extraia apenas o número" },
                    quantity: { type: Type.NUMBER, description: "Quantidade do medicamento. Se não for encontrada, o padrão é 1." },
                },
                required: ["name"],
            }
        }
    },
    required: ["medications"],
};

export const extractMedicationInfoFromFile = async (base64Data: string, mimeType: string): Promise<Partial<Medication>[]> => {
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: `Extraia as informações de TODOS os medicamentos listados no arquivo (que pode ser uma imagem, PDF ou texto). Retorne um array de objetos JSON dentro de um objeto principal com a chave "medications", mesmo que apenas um medicamento seja encontrado. Se uma informação não for encontrada para um medicamento, deixe o campo correspondente em branco ou omita-o.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: multipleMedicationsSchema,
      },
    });

    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText);
    
    if (result && result.medications && Array.isArray(result.medications)) {
        return result.medications;
    }
     if (result && Array.isArray(result)) {
        return result;
    }
    return [];
  } catch (error) {
    console.error("Error extracting medication info from file:", error);
    throw new Error("Não foi possível extrair informações do arquivo. Tente novamente.");
  }
};

export const extractMedicationInfoFromText = async (textContent: string): Promise<Partial<Medication>[]> => {
    const prompt = `
      Extraia as informações de TODOS os medicamentos do texto abaixo.
      Retorne um array de objetos JSON dentro de um objeto principal com a chave "medications", mesmo que apenas um medicamento seja encontrado.
      Se uma informação não for encontrada para um medicamento, deixe o campo correspondente em branco ou omita-o.
  
      Texto:
      ---
      ${textContent}
      ---
    `;
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: multipleMedicationsSchema,
        },
      });
  
      const jsonText = response.text.trim();
      const result = JSON.parse(jsonText);

      if (result && result.medications && Array.isArray(result.medications)) {
        return result.medications;
      }
      if (result && Array.isArray(result)) {
        return result;
      }
      return [];
    } catch (error) {
      console.error("Error extracting medication info from text:", error);
      throw new Error("Não foi possível extrair informações do texto. Tente novamente.");
    }
};


export const generateInventoryReport = async (inventory: Medication[], selectedColumns: string[]): Promise<string> => {
    if (inventory.length === 0) {
        return "O inventário está vazio. Nenhum relatório a ser gerado.";
    }

    const columnLabels: { [key: string]: string } = {
        name: 'Nome do Medicamento',
        activeIngredient: 'Princípio Ativo',
        manufacturer: 'Laboratório',
        presentation: 'Apresentação',
        class: 'Classe',
        mechanismOfAction: 'Mecanismo de Ação',
        quantity: 'Quantidade',
        expirationDate: 'Data de Validade',
        pmc: 'PMC (R$)',
        status: 'Status de Vencimento',
        barcode: 'Código de Barras',
        officeNumber: 'Nº do Consultório',
    };

    const requestedColumnLabels = selectedColumns.map(id => columnLabels[id] || id);

    const prompt = `
        Com base nos seguintes dados de inventário de medicamentos em formato JSON, gere um relatório em formato de tabela Markdown.
        Responda APENAS com a tabela Markdown, sem nenhum texto adicional, explicação ou blocos de código.

        A tabela deve conter EXATAMENTE as seguintes colunas, na ordem especificada:
        ${requestedColumnLabels.join(', ')}

        Regras para colunas especiais:
        - Para a coluna "Data de Validade", use o formato DD/MM/YYYY. Se a data não existir, use "-".
        - Para a coluna "PMC (R$)", formate os valores como moeda brasileira (ex: R$ 12,34). Se o valor for 0 ou não existir, use "-".
        - Para a coluna "Status de Vencimento", calcule o status com base na data de validade e a data de hoje. Use as seguintes categorias: "Vencido", "Vence < 30d", "Vence < 90d", "OK". Se não houver data de validade, use "N/A".
        
        Ordene a tabela pela data de validade, dos mais próximos de vencer para os mais distantes. Medicamentos sem data de validade devem ficar no final.

        Dados do Inventário:
        ${JSON.stringify(inventory, null, 2)}
    `;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
        });
        
        let reportText = response.text.trim();

        // The model sometimes wraps the markdown table in code fences (```markdown ... ```).
        // This logic removes them to ensure the table is rendered correctly as HTML.
        const lines = reportText.split('\n');
        if (lines.length > 2 && lines[0].startsWith('```') && lines[lines.length - 1].startsWith('```')) {
            reportText = lines.slice(1, -1).join('\n');
        }

        return reportText;
    } catch (error) {
        console.error("Error generating report:", error);
        throw new Error("Falha ao gerar o relatório de inventário.");
    }
};

export const generateMechanismOfAction = async (activeIngredient: string): Promise<string> => {
    if (!activeIngredient) {
        return "";
    }

    const prompt = `
        Explique o mecanismo de ação do princípio ativo "${activeIngredient}" de forma clara e concisa, como se estivesse explicando para um profissional de saúde. 
        A resposta deve focar no principal efeito farmacológico.
        Responda APENAS com a explicação, sem nenhuma introdução ou texto adicional.
    `;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
        });
        
        return response.text.trim();
    } catch (error) {
        console.error("Error generating mechanism of action:", error);
        throw new Error("Não foi possível gerar a explicação do mecanismo de ação.");
    }
};

export const suggestPmc = async (medicationName: string, presentation: string): Promise<number | null> => {
    if (!medicationName) {
        return null;
    }

    const prompt = `
        Qual é o Preço Máximo ao Consumidor (PMC) para o medicamento "${medicationName}" com apresentação "${presentation}", de acordo com a lista de preços oficial da CMED/ANVISA, especificamente para a alíquota de ICMS de 17%?
        
        Se a apresentação não for especificada, procure pelo nome do medicamento e retorne o PMC para a alíquota de 17%.
        
        Responda APENAS com o valor numérico, usando ponto como separador decimal. Por exemplo: 54.23
    `;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
        });
        
        const textResponse = response.text.trim();
        // Clean the response to get only the number
        const cleanedText = textResponse.replace(/[^\d.,]/g, '').replace(',', '.');
        const price = parseFloat(cleanedText);

        if (!isNaN(price) && price > 0) {
            return price;
        }
        return null;
    } catch (error) {
        console.error("Error suggesting PMC:", error);
        throw new Error("Não foi possível sugerir o PMC.");
    }
};

export const suggestMedicationClass = async (medicationName: string, activeIngredient?: string): Promise<string> => {
    if (!medicationName) {
        return "";
    }

    const prompt = `
        Qual a classe terapêutica mais comum para o medicamento "${medicationName}"${activeIngredient ? ` (princípio ativo: ${activeIngredient})` : ''}?
        Responda APENAS com o nome da classe (ex: Analgésico, Antibiótico).
    `;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
        });
        
        return response.text.trim();
    } catch (error) {
        console.error("Error suggesting medication class:", error);
        throw new Error("Não foi possível sugerir a classe do medicamento.");
    }
};

const medicationDetailsSchema = {
    type: Type.OBJECT,
    properties: {
        activeIngredient: { type: Type.STRING, description: "O princípio ativo mais comum para este medicamento." },
        manufacturer: { type: Type.STRING, description: "O laboratório fabricante mais comum." },
        presentation: { type: Type.STRING, description: "A apresentação mais comum (ex: 50mg, 30 comprimidos)." },
        class: { type: Type.STRING, description: "A classe terapêutica mais comum (ex: Analgésico, Antibiótico)." },
    }
};

export const suggestMedicationDetails = async (medicationName: string): Promise<Partial<Medication>> => {
    if (!medicationName || medicationName.length < 3) {
        return {};
    }

    const prompt = `
        Com base em informações públicas e de saúde (como bulas ou listas da ANVISA), forneça os detalhes mais comuns para o medicamento comercial "${medicationName}".
        Retorne um único objeto JSON com os seguintes campos: activeIngredient, manufacturer, presentation, class.
        Se uma informação não for encontrada, retorne uma string vazia para o campo correspondente.
    `;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: medicationDetailsSchema,
            },
        });
        
        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        
        if (result && typeof result === 'object' && !Array.isArray(result)) {
            return result;
        }
        return {};
    } catch (error) {
        console.error("Error suggesting medication details:", error);
        return {};
    }
};