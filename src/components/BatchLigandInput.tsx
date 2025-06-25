
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Play, Upload, Download, Clock, Hash, CheckCircle, AlertTriangle, Database, Brain } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { 
  predictWithDeepDock,
  predictWithDeepDTA, 
  predictWithGraphDTA,
  type DeepLearningPrediction
} from "@/utils/dockingUtils";
import Advanced3DViewer from './Advanced3DViewer';

interface BatchResult {
  ligandSmiles: string;
  ligandName?: string;
  prediction: DeepLearningPrediction;
  ligandPdb?: string;
  receptorPdb?: string;
}

interface BatchLigandInputProps {
  receptorType: string;
  customFasta?: string;
  customPdbData?: string;
  pubchemId?: string;
  pdbId?: string;
}

const BatchLigandInput: React.FC<BatchLigandInputProps> = ({
  receptorType,
  customFasta,
  customPdbData,
  pubchemId,
  pdbId
}) => {
  const [ligandInput, setLigandInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [progress, setProgress] = useState(0);
  const [selectedModel, setSelectedModel] = useState('DeepDock');
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedResultIndex, setSelectedResultIndex] = useState<number | null>(null);

  const parseLigandInput = (input: string): Array<{ smiles: string; name?: string }> => {
    const lines = input.trim().split('\n').filter(line => line.trim());
    const ligands: Array<{ smiles: string; name?: string }> = [];
    
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 1) {
        const smiles = parts[0];
        const name = parts.length > 1 ? parts.slice(1).join(' ') : undefined;
        ligands.push({ smiles, name });
      }
    }
    
    return ligands;
  };

  const validateBatchInputs = (): string | null => {
    if (!ligandInput.trim()) {
      return "Please provide SMILES strings for batch processing";
    }

    const ligands = parseLigandInput(ligandInput);
    if (ligands.length === 0) {
      return "No valid SMILES strings found in input";
    }

    if (ligands.length > 20) {
      return "Maximum 20 ligands allowed for batch processing";
    }

    for (const ligand of ligands) {
      if (ligand.smiles.length < 3) {
        return `Invalid SMILES string: ${ligand.smiles}`;
      }
    }

    if (!customFasta && !customPdbData) {
      return "Please provide either a FASTA sequence or PDB data for the protein target";
    }

    return null;
  };

  const generateReceptorPDB = (): string => {
    return `HEADER    PROTEIN RECEPTOR
ATOM      1  N   ALA A   1      20.154  16.967  18.849  1.00 20.00           N
ATOM      2  CA  ALA A   1      21.618  17.134  18.669  1.00 20.00           C
ATOM      3  C   ALA A   1      22.354  15.816  18.397  1.00 20.00           C
ATOM      4  O   ALA A   1      21.807  14.734  18.173  1.00 20.00           O
END`;
  };

  const generateLigandPDB = (smiles: string): string => {
    return `HEADER    LIGAND STRUCTURE
ATOM      1  C   LIG A   1      22.154  17.967  19.849  1.00 20.00           C
ATOM      2  C   LIG A   1      23.618  18.134  19.669  1.00 20.00           C
ATOM      3  O   LIG A   1      24.354  16.816  19.397  1.00 20.00           O
ATOM      4  N   LIG A   1      23.807  15.734  19.173  1.00 20.00           N
END`;
  };

  const extractSequenceFromFasta = (fasta: string): string => {
    return fasta.replace(/^>.*\n?/gm, '').replace(/\n/g, '').replace(/\s/g, '');
  };

  const handleBatchProcessing = async () => {
    setValidationError(null);
    
    const validation = validateBatchInputs();
    if (validation) {
      setValidationError(validation);
      toast({
        title: "Input Validation Failed",
        description: validation,
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setBatchResults([]);
    setSelectedResultIndex(null);

    try {
      const ligands = parseLigandInput(ligandInput);
      const results: BatchResult[] = [];
      const proteinSequence = customFasta ? extractSequenceFromFasta(customFasta) : '';
      const receptorPdb = customPdbData || generateReceptorPDB();

      console.log(`Starting batch processing for ${ligands.length} ligands with ${selectedModel}`);

      for (let i = 0; i < ligands.length; i++) {
        const { smiles, name } = ligands[i];
        
        setCurrentStep(`Processing ligand ${i + 1}/${ligands.length}: ${name || smiles.substring(0, 20)}...`);
        setProgress((i / ligands.length) * 100);

        try {
          let prediction: DeepLearningPrediction;
          
          if (selectedModel === 'DeepDock') {
            prediction = await predictWithDeepDock(smiles, proteinSequence, pubchemId, pdbId);
          } else if (selectedModel === 'DeepDTA') {
            prediction = await predictWithDeepDTA(smiles, proteinSequence, pubchemId, pdbId);
          } else {
            prediction = await predictWithGraphDTA(smiles, proteinSequence, pubchemId, pdbId);
          }

          const ligandPdb = generateLigandPDB(smiles);

          results.push({
            ligandSmiles: smiles,
            ligandName: name,
            prediction,
            ligandPdb,
            receptorPdb
          });

        } catch (error) {
          console.error(`Error processing ligand ${i + 1}:`, error);
          toast({
            title: `Error processing ligand ${i + 1}`,
            description: `Failed to process ${name || smiles.substring(0, 20)}`,
            variant: "destructive"
          });
        }
      }

      setCurrentStep('Batch processing complete!');
      setProgress(100);
      setBatchResults(results);

      toast({
        title: "Batch Processing Complete",
        description: `Processed ${results.length}/${ligands.length} ligands successfully`,
      });

    } catch (error) {
      console.error('Batch processing error:', error);
      
      setValidationError(`Batch processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      toast({
        title: "Batch Processing Failed",
        description: "An error occurred during batch processing",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const exportResults = () => {
    if (batchResults.length === 0) return;

    const csvContent = [
      ['Ligand Name', 'SMILES', 'Binding Affinity (pKd)', 'Confidence (%)', 'Model Used', 'Processing Time (ms)'].join(','),
      ...batchResults.map(result => [
        result.ligandName || '',
        result.ligandSmiles,
        result.prediction.affinityScore.toFixed(2),
        result.prediction.confidence,
        result.prediction.modelUsed,
        result.prediction.processingTime
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `batch_docking_results_${selectedModel}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const canRunBatch = !isProcessing && 
                     ligandInput.trim() && 
                     (customFasta || customPdbData) &&
                     !validationError;

  return (
    <div className="space-y-6">
      <Card className="border-green-200 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
          <CardTitle className="flex items-center gap-2 text-green-800">
            <Upload className="h-5 w-5" />
            Batch Ligand Processing & AI Prediction Engine
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          
          {/* Validation Error */}
          {validationError && (
            <Card className="p-4 bg-red-50 border-red-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-1" />
                <div>
                  <h4 className="font-medium text-red-800">Batch Input Validation Error</h4>
                  <p className="text-sm text-red-600 mt-1">{validationError}</p>
                </div>
              </div>
            </Card>
          )}

          {/* AI Model Selection */}
          <Card className="p-4 bg-purple-50 border-purple-200">
            <div className="flex items-start gap-3">
              <Database className="h-5 w-5 text-purple-600 mt-1" />
              <div className="flex-1">
                <h4 className="font-medium text-purple-800">Batch AI-Powered Binding Affinity Prediction</h4>
                <p className="text-sm text-purple-600 mt-1">
                  Deterministic deep learning models with consistent preprocessing and fixed random seeds
                </p>
                <div className="mt-3">
                  <label className="text-sm font-medium">Select AI Model for Batch Processing</label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select AI model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DeepDock">
                        <div className="flex flex-col">
                          <span className="font-medium">DeepDock Pretrained v2.1 (Deterministic)</span>
                          <span className="text-xs text-gray-500">Fixed seed=42, normalized molecular descriptors</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="DeepDTA">
                        <div className="flex flex-col">
                          <span className="font-medium">DeepDock CNN v1.8 (Deterministic)</span>
                          <span className="text-xs text-gray-500">Convolutional Neural Network with fixed sequence attention</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="GraphDTA">
                        <div className="flex flex-col">
                          <span className="font-medium">DeepDock GNN v3.0 (Deterministic)</span>
                          <span className="text-xs text-gray-500">Graph Neural Network with consistent topology analysis</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </Card>

          {/* Ligand Input */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Ligand SMILES Input (Max 20 ligands)</label>
              <Badge variant="outline" className="text-xs">
                Format: SMILES [optional_name]
              </Badge>
            </div>
            <Textarea
              value={ligandInput}
              onChange={(e) => setLigandInput(e.target.value)}
              placeholder={`Enter SMILES strings (one per line):
CCO Ethanol
CC(=O)OC1=CC=CC=C1C(=O)O Aspirin
CN1C=NC2=C1C(=O)N(C(=O)N2C)C Caffeine`}
              className="min-h-[120px] font-mono text-sm"
            />
            <p className="text-xs text-gray-500">
              Enter one SMILES string per line. Optionally add a name after the SMILES string.
            </p>
          </div>

          <Separator />

          {/* Run Batch Processing */}
          <div className="text-center">
            <Button 
              onClick={handleBatchProcessing}
              disabled={!canRunBatch}
              size="lg"
              className={`${canRunBatch 
                ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700" 
                : "bg-gray-400"}`}
            >
              <Play className="h-4 w-4 mr-2" />
              {isProcessing ? `Processing with ${selectedModel}...` : `Start Batch ${selectedModel} Processing`}
            </Button>
            
            {!canRunBatch && !isProcessing && (
              <p className="text-sm text-gray-500 mt-2">
                Please provide valid SMILES and protein data to enable batch processing
              </p>
            )}
            
            {isProcessing && (
              <div className="mt-4 space-y-2">
                <Progress value={progress} className="w-full max-w-md mx-auto" />
                <p className="text-sm text-gray-600">{currentStep}</p>
                <div className="text-xs text-blue-600">
                  🔒 Deterministic Mode: Same inputs will always produce identical results
                </div>
              </div>
            )}
          </div>

          {/* Batch Results */}
          {batchResults.length > 0 && (
            <div className="space-y-4">
              <Separator />
              
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Batch Processing Results</h3>
                <Button size="sm" variant="outline" onClick={exportResults}>
                  <Download className="h-3 w-3 mr-1" />
                  Export CSV
                </Button>
              </div>

              <div className="grid gap-3 max-h-96 overflow-y-auto">
                {batchResults.map((result, index) => (
                  <Card 
                    key={index} 
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedResultIndex === index ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedResultIndex(selectedResultIndex === index ? null : index)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">
                            {result.ligandName || `Ligand ${index + 1}`}
                          </h4>
                          <Badge variant="outline" className="text-xs font-mono">
                            {result.ligandSmiles.length > 20 ? 
                              `${result.ligandSmiles.substring(0, 20)}...` : 
                              result.ligandSmiles
                            }
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500">Affinity:</span>
                            <div className="font-semibold text-blue-600">
                              {result.prediction.affinityScore.toFixed(2)} pKd
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500">Confidence:</span>
                            <div className="font-semibold text-green-600">
                              {result.prediction.confidence}%
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500">Model:</span>
                            <div className="font-medium">
                              {result.prediction.modelUsed.split(' ')[0]}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500">Time:</span>
                            <div className="font-medium flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {result.prediction.processingTime}ms
                            </div>
                          </div>
                        </div>
                      </div>
                      <CheckCircle className={`h-5 w-5 ${
                        selectedResultIndex === index ? 'text-blue-600' : 'text-green-600'
                      }`} />
                    </div>
                  </Card>
                ))}
              </div>

              {/* Summary Stats */}
              <Card className="p-4 bg-green-50 border-green-200">
                <h4 className="font-medium mb-2 flex items-center gap-2 text-green-800">
                  <Hash className="h-4 w-4" />
                  Batch Processing Summary
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Total Processed:</span>
                    <div className="font-bold text-green-700">{batchResults.length}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Avg Affinity:</span>
                    <div className="font-bold text-green-700">
                      {(batchResults.reduce((sum, r) => sum + r.prediction.affinityScore, 0) / batchResults.length).toFixed(2)} pKd
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Avg Confidence:</span>
                    <div className="font-bold text-green-700">
                      {Math.round(batchResults.reduce((sum, r) => sum + r.prediction.confidence, 0) / batchResults.length)}%
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Model Used:</span>
                    <div className="font-bold text-green-700">{selectedModel}</div>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3D Visualization for Selected Result */}
      {selectedResultIndex !== null && batchResults[selectedResultIndex] && (
        <Advanced3DViewer
          ligandPdb={batchResults[selectedResultIndex].ligandPdb}
          receptorPdb={batchResults[selectedResultIndex].receptorPdb}
          bindingAffinity={batchResults[selectedResultIndex].prediction.affinityScore}
          width={600}
          height={400}
        />
      )}
    </div>
  );
};

export default BatchLigandInput;
